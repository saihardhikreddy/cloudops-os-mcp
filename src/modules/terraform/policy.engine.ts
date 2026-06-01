/**
 * Rego / OPA Policy Engine
 * -------------------------------------------------------------------------
 * Accepts a raw .rego policy document (Open Policy Agent's policy language)
 * alongside the current Terraform HCL, and returns Diagnostic-shaped
 * violations that can be merged into the CloudOps OS pipeline output.
 *
 * Two evaluation paths:
 *  1. REAL OPA — if the `opa` CLI binary is available on PATH, we shell out
 *     to `opa eval` against a JSON "planish" representation of the HCL
 *     (extracted resource blocks) and the user's actual .rego source. This
 *     is genuine Rego evaluation, not a simulation.
 *  2. REGO-LITE FALLBACK — if `opa` is not installed on the host (common in
 *     hackathon / sandboxed environments), we run a narrow, transparent
 *     interpreter that understands the common
 *       deny[msg] { input.resource.type == "..."; input.resource.<attr> == "..." }
 *     and `!=`/`contains` shapes used in typical governance policies. Every
 *     diagnostic produced this way is explicitly labeled
 *     `source: 'rego-lite-fallback'` so the HITL console never claims a
 *     stronger guarantee than what actually ran (this is the XAI contract).
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ExecutionContext, Diagnostic } from './terraform.types.js';

const execFileAsync = promisify(execFile);

export interface ParsedResource {
  type: string;
  name: string;
  attrs: Record<string, string>;
  raw: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * Very small, dependency-free HCL resource-block extractor. It is not a
 * full HCL2 AST parser (that's flagged as future work in the build
 * strategy doc), but it reliably captures `resource "type" "name" { ... }`
 * blocks and their flat `key = "value"` / `key = value` attribute pairs,
 * which is exactly the surface area OPA policies need to reason about.
 */
export function extractResources(hcl: string): ParsedResource[] {
  const resources: ParsedResource[] = [];
  const lines = hcl.split('\n');
  const headerRegex = /^\s*resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/;

  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(headerRegex);
    if (match) {
      const startLine = i;
      let depth = 1;
      let j = i + 1;
      const bodyLines: string[] = [];
      while (j < lines.length && depth > 0) {
        const opens = (lines[j].match(/\{/g) || []).length;
        const closes = (lines[j].match(/\}/g) || []).length;
        depth += opens - closes;
        if (depth > 0) bodyLines.push(lines[j]);
        j++;
      }
      const body = bodyLines.join('\n');
      const attrs: Record<string, string> = {};
      const attrRegex = /^\s*([a-zA-Z0-9_]+)\s*=\s*(.+?)\s*$/gm;
      let am: RegExpExecArray | null;
      while ((am = attrRegex.exec(body)) !== null) {
        const key = am[1];
        let value = am[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        // Skip nested-block openers picked up accidentally
        if (!value.endsWith('{')) attrs[key] = value;
      }
      resources.push({
        type: match[1],
        name: match[2],
        attrs,
        raw: [lines[startLine], ...bodyLines, '}'].join('\n'),
        lineStart: startLine + 1,
        lineEnd: j
      });
      i = j;
    } else {
      i++;
    }
  }
  return resources;
}

async function findOpaBinary(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(process.platform === 'win32' ? 'where' : 'which', ['opa']);
    const p = stdout.trim().split('\n')[0];
    return p || null;
  } catch {
    return null;
  }
}

async function runRealOpa(
  resources: ParsedResource[],
  regoSource: string,
  opaPath: string
): Promise<{ messages: string[]; raw: string }> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudops-opa-'));
  const policyPath = path.join(tmpDir, 'policy.rego');
  const inputPath = path.join(tmpDir, 'input.json');
  try {
    fs.writeFileSync(policyPath, regoSource, 'utf-8');
    fs.writeFileSync(
      inputPath,
      JSON.stringify({ resource: resources.map(r => ({ type: r.type, name: r.name, ...r.attrs })) }, null, 2)
    );
    const { stdout } = await execFileAsync(opaPath, [
      'eval',
      '--format', 'json',
      '--data', policyPath,
      '--input', inputPath,
      'data'
    ]);
    const parsed = JSON.parse(stdout);
    const messages: string[] = [];
    const results = parsed?.result?.[0]?.expressions?.[0]?.value ?? {};
    for (const pkg of Object.values(results) as any[]) {
      const denySet = pkg?.deny;
      if (Array.isArray(denySet)) messages.push(...denySet);
      else if (denySet && typeof denySet === 'object') messages.push(...Object.keys(denySet));
    }
    return { messages, raw: stdout };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Rego-lite fallback: extracts `deny[msg] { ... }` rule bodies and
 * evaluates a restricted grammar of conditions against extracted
 * resources: `input.resource.type == "x"`, `input.resource.<attr> == "y"`,
 * `input.resource.<attr> != "y"`, and `contains(input.resource.<attr>, "y")`.
 * Any condition it cannot understand causes that rule to be SKIPPED (never
 * silently assumed true), which keeps false positives out of the console.
 */
export function runRegoLite(resources: ParsedResource[], regoSource: string): { messages: string[]; rulesEvaluated: number; rulesSkipped: number } {
  const ruleRegex = /deny\s*\[\s*msg\s*\]\s*\{([^}]*)\}/g;
  const messages: string[] = [];
  let rulesEvaluated = 0;
  let rulesSkipped = 0;
  let rm: RegExpExecArray | null;

  while ((rm = ruleRegex.exec(regoSource)) !== null) {
    const body = rm[1];
    const statements = body.split(/[\n;]/).map(s => s.trim()).filter(Boolean);
    const msgLine = statements.find(s => /^msg\s*(:=|=)/.test(s));
    let msgTemplate = 'Rego policy violation detected';
    if (msgLine) {
      const strMatch = msgLine.match(/["'`](.+?)["'`]/);
      if (strMatch) msgTemplate = strMatch[1];
    }

    const conditions = statements.filter(s => !/^msg\s*(:=|=)/.test(s));
    let understood = true;
    let matchedAny = false;

    for (const res of resources) {
      let allConditionsPass = true;
      for (const cond of conditions) {
        const eq = cond.match(/input\.resource\.([a-zA-Z0-9_]+)\s*==\s*["'`]?([^"'`]+)["'`]?/);
        const neq = cond.match(/input\.resource\.([a-zA-Z0-9_]+)\s*!=\s*["'`]?([^"'`]+)["'`]?/);
        const contains = cond.match(/contains\(\s*input\.resource\.([a-zA-Z0-9_]+)\s*,\s*["'`]([^"'`]+)["'`]\s*\)/);

        if (eq) {
          const field = eq[1] === 'type' ? res.type : res.attrs[eq[1]];
          if (field !== eq[2].trim()) allConditionsPass = false;
        } else if (neq) {
          const field = neq[1] === 'type' ? res.type : res.attrs[neq[1]];
          if (field === neq[2].trim()) allConditionsPass = false;
        } else if (contains) {
          const field = contains[1] === 'type' ? res.type : (res.attrs[contains[1]] || '');
          if (!field.includes(contains[2])) allConditionsPass = false;
        } else if (cond.length > 0) {
          understood = false;
        }
      }
      if (understood && conditions.length > 0 && allConditionsPass) {
        matchedAny = true;
        messages.push(`${msgTemplate} (resource: ${res.type}.${res.name})`);
      }
    }

    if (!understood) rulesSkipped++;
    else rulesEvaluated++;
    void matchedAny;
  }

  return { messages, rulesEvaluated, rulesSkipped };
}

export async function evaluateRegoPolicy(
  hcl: string,
  regoSource: string,
  ctx: ExecutionContext
): Promise<Diagnostic[]> {
  const resources = extractResources(hcl);
  const diagnostics: Diagnostic[] = [];

  const opaPath = await findOpaBinary();
  let messages: string[] = [];
  let engineUsed: 'opa' | 'rego-lite-fallback' = 'rego-lite-fallback';

  if (opaPath) {
    try {
      ctx.logger.info(`Rego policy: evaluating with real OPA binary at ${opaPath}`);
      const result = await runRealOpa(resources, regoSource, opaPath);
      messages = result.messages;
      engineUsed = 'opa';
    } catch (err) {
      ctx.logger.warn('OPA binary execution failed, falling back to rego-lite interpreter', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  if (engineUsed === 'rego-lite-fallback') {
    ctx.logger.info('Rego policy: no `opa` binary on PATH — using built-in rego-lite fallback interpreter (subset of Rego: ==, !=, contains on input.resource.*)');
    const result = runRegoLite(resources, regoSource);
    messages = result.messages;
    ctx.logger.info(`rego-lite: ${result.rulesEvaluated} rule(s) evaluated, ${result.rulesSkipped} rule(s) skipped (unsupported syntax)`);
  }

  messages.forEach((msg, idx) => {
    diagnostics.push({
      id: `REGO-${String(idx + 1).padStart(3, '0')}`,
      agent: 'PolicyGovernance',
      severity: 'CRITICAL',
      file: 'policy.rego',
      lineStart: 1,
      lineEnd: 1,
      flaggedSnippet: msg,
      explanation: `Custom governance policy (.rego) evaluated by ${engineUsed === 'opa' ? 'Open Policy Agent' : 'the built-in rego-lite fallback interpreter'} flagged this configuration as non-compliant with the enterprise-supplied policy document.`,
      diagnosis: msg,
      resolvedSnippet: '// Requires manual review — custom policy violations are surfaced, not auto-rewritten',
      remediation: 'Update the flagged resource to satisfy the deny rule in the supplied .rego policy, or revise the policy if the rule is no longer applicable.',
      source: engineUsed,
      confidence: engineUsed === 'opa' ? 0.98 : 0.75
    });
  });

  return diagnostics;
}
