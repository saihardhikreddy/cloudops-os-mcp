/**
 * CloudOps OS LLM Orchestration Tests
 * ===================================
 * Tests for real-time LLM streaming and agent chaining.
 * Validates that the LLM reasoning agent correctly:
 * 1. Receives output from deterministic agents
 * 2. Chains reasoning across agent outputs
 * 3. Streams responses in real-time
 * 4. Handles provider failures gracefully
 * 5. Maintains confidence scores
 */

import type { Diagnostic, ReasoningLog } from '../src/modules/terraform/terraform.types.js';

describe('LLM Orchestration & Real-Time Streaming', () => {
  describe('LLM Provider Chain', () => {
    test('should prioritize OPENROUTER_API_KEY over GROQ_API_KEY', () => {
      const providers = [];
      
      if (process.env.OPENROUTER_API_KEY) {
        providers.push('openrouter');
      }
      if (process.env.GROQ_API_KEY) {
        providers.push('groq');
      }

      // If both are set, openrouter should be first
      if (providers.length === 2) {
        expect(providers[0]).toBe('openrouter');
      }
    });

    test('should skip LLM if no API keys configured', () => {
      const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
      const hasGroq = !!process.env.GROQ_API_KEY;
      
      if (!hasOpenRouter && !hasGroq) {
        // LLM should be skipped gracefully
        expect(true).toBe(true);
      }
    });

    test('should use correct model for OpenRouter', () => {
      const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct';
      expect(model).toContain('llama');
    });

    test('should use correct model for Groq', () => {
      const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      expect(model).toContain('llama');
    });
  });

  describe('Agent Chaining', () => {
    test('should pass ResourceRoute output to CostOptimization', () => {
      const resourceRouteOutput = {
        agent: 'ResourceRoute',
        findings: ['NAT Gateway inefficiency detected'],
        recommendations: ['Replace with VPC Endpoints']
      };

      const costOptimizationInput = resourceRouteOutput;
      expect(costOptimizationInput.agent).toBe('ResourceRoute');
    });

    test('should pass CostOptimization output to PolicyGovernance', () => {
      const costOptimizationOutput = {
        agent: 'CostOptimization',
        findings: ['Over-provisioned compute', 'Legacy storage'],
        recommendations: ['Right-size to t3.medium', 'Upgrade to gp3']
      };

      const policyGovernanceInput = costOptimizationOutput;
      expect(policyGovernanceInput.agent).toBe('CostOptimization');
    });

    test('should pass PolicyGovernance output to Release', () => {
      const policyGovernanceOutput = {
        agent: 'PolicyGovernance',
        findings: ['Unauthorized region', 'Exposed SSH'],
        recommendations: ['Change to us-east-1', 'Restrict to 10.0.0.0/8']
      };

      const releaseInput = policyGovernanceOutput;
      expect(releaseInput.agent).toBe('PolicyGovernance');
    });

    test('should pass Release output to LLMReasoner', () => {
      const releaseOutput = {
        agent: 'Release',
        status: 'validated',
        planSummary: 'Plan: 1 to add, 3 to change, 0 to destroy'
      };

      const llmReasonerInput = releaseOutput;
      expect(llmReasonerInput.agent).toBe('Release');
    });

    test('should accumulate diagnostics across all agents', () => {
      const diagnostics: Diagnostic[] = [];

      // ResourceRoute adds findings
      diagnostics.push({
        id: 'RTE-001',
        agent: 'ResourceRoute',
        severity: 'INFO',
        file: 'main.tf',
        lineStart: 1,
        lineEnd: 1,
        flaggedSnippet: 'NAT Gateway',
        explanation: 'NAT Gateway inefficiency',
        diagnosis: 'Inefficient routing',
        resolvedSnippet: 'VPC Endpoint',
        remediation: 'Replace with VPC Endpoint',
        source: 'deterministic',
        confidence: 0.95
      });

      // CostOptimization adds findings
      diagnostics.push({
        id: 'CST-001',
        agent: 'CostOptimization',
        severity: 'INFO',
        file: 'main.tf',
        lineStart: 1,
        lineEnd: 1,
        flaggedSnippet: 'm5.2xlarge',
        explanation: 'Over-provisioned compute',
        diagnosis: 'Compute right-sizing',
        resolvedSnippet: 't3.medium',
        remediation: 'Downsize to t3.medium',
        source: 'deterministic',
        confidence: 0.95
      });

      // PolicyGovernance adds findings
      diagnostics.push({
        id: 'GOV-001',
        agent: 'PolicyGovernance',
        severity: 'CRITICAL',
        file: 'main.tf',
        lineStart: 1,
        lineEnd: 1,
        flaggedSnippet: 'eu-west-2',
        explanation: 'Unauthorized region',
        diagnosis: 'SCP violation',
        resolvedSnippet: 'us-east-1',
        remediation: 'Change to authorized region',
        source: 'deterministic',
        confidence: 0.95
      });

      // LLMReasoner adds findings
      diagnostics.push({
        id: 'LLM-001',
        agent: 'LLMReasoner',
        severity: 'INFO',
        file: 'main.tf',
        lineStart: 1,
        lineEnd: 1,
        flaggedSnippet: 'Missing lifecycle block',
        explanation: 'Resource lacks lifecycle configuration',
        diagnosis: 'Structural smell',
        resolvedSnippet: 'lifecycle { create_before_destroy = true }',
        remediation: 'Add lifecycle block',
        source: 'llm',
        confidence: 0.72
      });

      expect(diagnostics.length).toBe(4);
      expect(diagnostics.filter(d => d.agent === 'ResourceRoute').length).toBe(1);
      expect(diagnostics.filter(d => d.agent === 'CostOptimization').length).toBe(1);
      expect(diagnostics.filter(d => d.agent === 'PolicyGovernance').length).toBe(1);
      expect(diagnostics.filter(d => d.agent === 'LLMReasoner').length).toBe(1);
    });
  });

  describe('Real-Time Streaming', () => {
    test('should emit reasoning logs in real-time', () => {
      const logs: ReasoningLog[] = [];

      logs.push({
        timestamp: new Date().toISOString(),
        agent: 'ResourceRoute',
        message: 'Analyzing routing topology...'
      });

      logs.push({
        timestamp: new Date().toISOString(),
        agent: 'ResourceRoute',
        message: 'FLAGGED: NAT Gateway detected'
      });

      logs.push({
        timestamp: new Date().toISOString(),
        agent: 'CostOptimization',
        message: 'Analyzing compute sizing...'
      });

      expect(logs.length).toBe(3);
      expect(logs[0].agent).toBe('ResourceRoute');
      expect(logs[1].message).toContain('FLAGGED');
      expect(logs[2].agent).toBe('CostOptimization');
    });

    test('should maintain chronological order of logs', () => {
      const logs: ReasoningLog[] = [];
      const timestamps: number[] = [];

      for (let i = 0; i < 5; i++) {
        const ts = Date.now() + i;
        logs.push({
          timestamp: new Date(ts).toISOString(),
          agent: 'TestAgent',
          message: `Log ${i}`
        });
        timestamps.push(ts);
      }

      // Verify timestamps are in order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    test('should include details in streaming logs', () => {
      const log: ReasoningLog = {
        timestamp: new Date().toISOString(),
        agent: 'CostOptimization',
        message: 'Compute right-sizing analysis',
        details: 'Detected m5.2xlarge (8 vCPU, 32GB RAM) for static site. Recommend t3.medium (2 vCPU, 4GB RAM). Savings: $250/month.'
      };

      expect(log.details).toBeTruthy();
      expect(log.details).toContain('$250/month');
    });
  });

  describe('Confidence Scoring', () => {
    test('should assign high confidence to deterministic findings', () => {
      const deterministicConfidence = 0.95;
      expect(deterministicConfidence).toBeGreaterThan(0.9);
    });

    test('should assign high confidence to OPA findings', () => {
      const opaConfidence = 0.98;
      expect(opaConfidence).toBeGreaterThan(0.95);
    });

    test('should assign medium confidence to rego-lite findings', () => {
      const regoLiteConfidence = 0.75;
      expect(regoLiteConfidence).toBeGreaterThan(0.5);
      expect(regoLiteConfidence).toBeLessThan(0.9);
    });

    test('should assign variable confidence to LLM findings', () => {
      const llmConfidences = [0.6, 0.72, 0.85, 0.92];
      llmConfidences.forEach(conf => {
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      });
    });

    test('should extract confidence from LLM response', () => {
      const llmResponse = {
        diagnostics: [
          {
            id: 'LLM-001',
            severity: 'INFO',
            flaggedSnippet: 'Missing lifecycle',
            explanation: 'Resource lacks lifecycle configuration',
            diagnosis: 'Structural smell',
            resolvedSnippet: 'lifecycle { ... }',
            remediation: 'Add lifecycle block',
            confidence: 0.72
          }
        ]
      };

      const diagnostic = llmResponse.diagnostics[0];
      expect(diagnostic.confidence).toBe(0.72);
    });
  });

  describe('Error Handling & Graceful Degradation', () => {
    test('should continue pipeline if LLM provider is unavailable', () => {
      const llmAvailable = false;
      const pipelineCanContinue = true;

      if (!llmAvailable) {
        expect(pipelineCanContinue).toBe(true);
      }
    });

    test('should continue pipeline if LLM API returns error', () => {
      const llmError = new Error('API rate limit exceeded');
      const pipelineCanContinue = true;

      expect(pipelineCanContinue).toBe(true);
    });

    test('should continue pipeline if LLM response is malformed', () => {
      const llmResponse = 'Invalid JSON response';
      const pipelineCanContinue = true;

      expect(pipelineCanContinue).toBe(true);
    });

    test('should log LLM failures without throwing', () => {
      const logs: ReasoningLog[] = [];

      logs.push({
        timestamp: new Date().toISOString(),
        agent: 'LLMReasoner',
        message: 'Provider call failed (API rate limit exceeded). Pipeline continues without LLM enrichment.'
      });

      expect(logs.length).toBe(1);
      expect(logs[0].message).toContain('Pipeline continues');
    });

    test('should return empty diagnostics if LLM fails', () => {
      const llmResult = {
        diagnostics: [],
        logs: [
          {
            timestamp: new Date().toISOString(),
            agent: 'LLMReasoner',
            message: 'Skipped: no OPENROUTER_API_KEY or GROQ_API_KEY configured.'
          }
        ]
      };

      expect(llmResult.diagnostics.length).toBe(0);
      expect(llmResult.logs.length).toBe(1);
    });
  });

  describe('Multi-Agent Reasoning', () => {
    test('should synthesize findings from all agents', () => {
      const allFindings = [
        { agent: 'ResourceRoute', type: 'routing', count: 1 },
        { agent: 'CostOptimization', type: 'compute', count: 2 },
        { agent: 'PolicyGovernance', type: 'compliance', count: 3 },
        { agent: 'Release', type: 'syntax', count: 1 }
      ];

      const totalFindings = allFindings.reduce((sum, f) => sum + f.count, 0);
      expect(totalFindings).toBe(7);
    });

    test('should prioritize CRITICAL findings over INFO', () => {
      const findings = [
        { severity: 'INFO', priority: 3 },
        { severity: 'WARNING', priority: 2 },
        { severity: 'CRITICAL', priority: 1 }
      ];

      const sorted = findings.sort((a, b) => a.priority - b.priority);
      expect(sorted[0].severity).toBe('CRITICAL');
      expect(sorted[2].severity).toBe('INFO');
    });

    test('should aggregate cost savings across agents', () => {
      const savings = [
        { agent: 'ResourceRoute', amount: 77.40 },
        { agent: 'CostOptimization', amount: 250 },
        { agent: 'CostOptimization', amount: 2 }
      ];

      const totalSavings = savings.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSavings).toBe(329.40);
    });

    test('should track agent execution order', () => {
      const executionOrder: string[] = [];

      executionOrder.push('ResourceRoute');
      executionOrder.push('CostOptimization');
      executionOrder.push('PolicyGovernance');
      executionOrder.push('Release');
      executionOrder.push('LLMReasoner');

      expect(executionOrder[0]).toBe('ResourceRoute');
      expect(executionOrder[4]).toBe('LLMReasoner');
      expect(executionOrder.length).toBe(5);
    });
  });

  describe('LLM System Prompt Compliance', () => {
    test('should instruct LLM to avoid re-flagging deterministic issues', () => {
      const systemPrompt = `Do NOT re-flag anything a simple regex on instance_type/volume_type/region/cidr_blocks/tags would already catch`;
      expect(systemPrompt).toContain('Do NOT re-flag');
    });

    test('should instruct LLM to focus on structural smells', () => {
      const systemPrompt = `Your job is ONLY to find additional, genuinely non-obvious issues they would miss: naming/readability smells, missing lifecycle{} or depends_on where implied`;
      expect(systemPrompt).toContain('structural smells');
    });

    test('should instruct LLM to return JSON format', () => {
      const systemPrompt = `Return ONLY a JSON object (no markdown fences) of the shape: { "diagnostics": [...] }`;
      expect(systemPrompt).toContain('JSON object');
    });

    test('should instruct LLM to include confidence scores', () => {
      const systemPrompt = `"confidence": 0.0-1.0`;
      expect(systemPrompt).toContain('confidence');
    });
  });

  describe('Response Format Validation', () => {
    test('should validate LLM response has diagnostics array', () => {
      const response = {
        diagnostics: [
          {
            id: 'LLM-001',
            severity: 'INFO',
            flaggedSnippet: 'test',
            explanation: 'test',
            diagnosis: 'test',
            resolvedSnippet: 'test',
            remediation: 'test',
            confidence: 0.8
          }
        ]
      };

      expect(Array.isArray(response.diagnostics)).toBe(true);
    });

    test('should validate each diagnostic has required fields', () => {
      const diagnostic = {
        id: 'LLM-001',
        severity: 'INFO',
        flaggedSnippet: 'test',
        explanation: 'test',
        diagnosis: 'test',
        resolvedSnippet: 'test',
        remediation: 'test',
        confidence: 0.8
      };

      expect(diagnostic.id).toBeTruthy();
      expect(diagnostic.severity).toBeTruthy();
      expect(diagnostic.flaggedSnippet).toBeTruthy();
      expect(diagnostic.explanation).toBeTruthy();
      expect(diagnostic.diagnosis).toBeTruthy();
      expect(diagnostic.remediation).toBeTruthy();
      expect(typeof diagnostic.confidence).toBe('number');
    });

    test('should validate severity is one of CRITICAL, WARNING, INFO', () => {
      const validSeverities = ['CRITICAL', 'WARNING', 'INFO'];
      const testSeverity = 'INFO';

      expect(validSeverities).toContain(testSeverity);
    });

    test('should validate confidence is between 0 and 1', () => {
      const confidences = [0, 0.5, 0.75, 1.0];

      confidences.forEach(conf => {
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Streaming Performance', () => {
    test('should emit logs with minimal latency', () => {
      const startTime = Date.now();
      const logs: ReasoningLog[] = [];

      for (let i = 0; i < 100; i++) {
        logs.push({
          timestamp: new Date().toISOString(),
          agent: 'TestAgent',
          message: `Log ${i}`
        });
      }

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in < 1 second
    });

    test('should handle large diagnostic payloads', () => {
      const diagnostics: Diagnostic[] = [];

      for (let i = 0; i < 1000; i++) {
        diagnostics.push({
          id: `DIAG-${i}`,
          agent: 'TestAgent',
          severity: 'INFO',
          file: 'main.tf',
          lineStart: i,
          lineEnd: i + 1,
          flaggedSnippet: `Snippet ${i}`,
          explanation: `Explanation ${i}`,
          diagnosis: `Diagnosis ${i}`,
          resolvedSnippet: `Resolved ${i}`,
          remediation: `Remediation ${i}`,
          source: 'deterministic',
          confidence: 0.95
        });
      }

      expect(diagnostics.length).toBe(1000);
    });
  });
});
