/**
 * LLM Reasoning Agent
 * -------------------------------------------------------------------------
 * The deterministic rule compiler in terraform.tools.ts is the reliable
 * backbone of CloudOps OS — it never depends on network access or an API
 * key, so the demo always works. This module adds an *optional* fifth
 * agent on top of it: an LLM call that re-reads the (already-optimized)
 * HCL plus the reviewer's free-text instructions and looks for anything
 * the deterministic + rego passes could not catch (structural smells,
 * ambiguous naming, missing lifecycle blocks, etc).
 *
 * Design contract:
 *  - Provider chain: OPENROUTER_API_KEY -> GROQ_API_KEY -> disabled.
 *  - Never throws out of the tool call — a failed/absent LLM call degrades
 *    to a single INFO log line, not a broken pipeline.
 *  - Every diagnostic it returns is tagged `source: 'llm'` with a
 *    `confidence` score extracted from the model's own self-report (XAI).
 */

import * as https from 'https';
import type { Diagnostic, ExecutionContext, ReasoningLog } from './terraform.types.js';

function httpsPostJson(urlStr: string, payload: any, headers: Record<string, string>): Promise<{ statusCode?: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are the LLMReasoner agent inside CloudOps OS, a multi-agent Terraform \
governance pipeline. A deterministic rule engine and an OPA/.rego policy pass have already run \
on this HCL. Your job is ONLY to find additional, genuinely non-obvious issues they would miss: \
naming/readability smells, missing lifecycle{} or depends_on where implied, risky defaults, or \
policy intent gaps between the user's free-text instructions and the code. \
Do NOT re-flag anything a simple regex on instance_type/volume_type/region/cidr_blocks/tags would \
already catch — assume that is handled.

Return ONLY a JSON object (no markdown fences) of the shape:
{
  "diagnostics": [
    {
      "id": "LLM-001",
      "severity": "INFO" | "WARNING" | "CRITICAL",
      "flaggedSnippet": "string, a short quoted excerpt",
      "explanation": "why this matters",
      "diagnosis": "short root-cause label",
      "resolvedSnippet": "suggested replacement, or '' if advisory only",
      "remediation": "one-sentence fix instruction",
      "confidence": 0.0-1.0
    }
  ]
}
If there is nothing further to add, return {"diagnostics": []}.`;

interface ProviderConfig {
  name: 'openrouter' | 'groq';
  url: string;
  headers: Record<string, string>;
  model: string;
  extractText: (body: any) => string | undefined;
}

function resolveProvider(): ProviderConfig | null {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (openrouterKey) {
    return {
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://nitrostack.ai',
        'X-Title': 'CloudOps OS'
      },
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
      extractText: (body) => body?.choices?.[0]?.message?.content
    };
  }
  if (groqKey) {
    return {
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: { Authorization: `Bearer ${groqKey}` },
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      extractText: (body) => body?.choices?.[0]?.message?.content
    };
  }
  return null;
}

export async function runLLMReasoningAgent(
  hcl: string,
  userInstructions: string,
  ctx: ExecutionContext
): Promise<{ diagnostics: Diagnostic[]; logs: ReasoningLog[] }> {
  const timestamp = () => new Date().toISOString();
  const logs: ReasoningLog[] = [];
  const provider = resolveProvider();

  if (!provider) {
    logs.push({
      timestamp: timestamp(),
      agent: 'LLMReasoner',
      message: 'Skipped: no OPENROUTER_API_KEY or GROQ_API_KEY configured. Deterministic + rego passes remain authoritative.'
    });
    return { diagnostics: [], logs };
  }

  logs.push({
    timestamp: timestamp(),
    agent: 'LLMReasoner',
    message: `Dispatching supplementary review to ${provider.name} (${provider.model}).`
  });

  try {
    const response = await httpsPostJson(
      provider.url,
      {
        model: provider.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Reviewer instructions: "${userInstructions || 'none'}"\n\nCurrent Terraform HCL:\n${hcl}` }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      },
      provider.headers
    );

    if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`${provider.name} API returned status ${response.statusCode}: ${response.body.slice(0, 300)}`);
    }

    const body = JSON.parse(response.body);
    const text = provider.extractText(body);
    if (!text) throw new Error(`${provider.name} response contained no message content`);

    const cleaned = text.trim().replace(/^```json/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    const rawDiags: any[] = Array.isArray(parsed?.diagnostics) ? parsed.diagnostics : [];

    const diagnostics: Diagnostic[] = rawDiags.map((d, idx) => ({
      id: d.id || `LLM-${String(idx + 1).padStart(3, '0')}`,
      agent: 'LLMReasoner',
      severity: ['CRITICAL', 'WARNING', 'INFO'].includes(d.severity) ? d.severity : 'INFO',
      file: 'main.tf',
      lineStart: 1,
      lineEnd: 1,
      flaggedSnippet: String(d.flaggedSnippet || ''),
      explanation: String(d.explanation || ''),
      diagnosis: String(d.diagnosis || 'LLM-flagged observation'),
      resolvedSnippet: String(d.resolvedSnippet || ''),
      remediation: String(d.remediation || ''),
      source: 'llm',
      confidence: typeof d.confidence === 'number' ? Math.max(0, Math.min(1, d.confidence)) : 0.6
    }));

    logs.push({
      timestamp: timestamp(),
      agent: 'LLMReasoner',
      message: `Supplementary review complete via ${provider.name}: ${diagnostics.length} additional finding(s).`
    });

    return { diagnostics, logs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.warn('LLMReasoner agent call failed — continuing with deterministic + rego results only', { error: message });
    logs.push({
      timestamp: timestamp(),
      agent: 'LLMReasoner',
      message: `Provider call failed (${message}). Pipeline continues without LLM enrichment — deterministic and rego findings are unaffected.`
    });
    return { diagnostics: [], logs };
  }
}
