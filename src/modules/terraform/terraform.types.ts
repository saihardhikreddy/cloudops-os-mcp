import type { ExecutionContext } from '@nitrostack/core';
export type { ExecutionContext };

export type AgentName = 'ResourceRoute' | 'CostOptimization' | 'PolicyGovernance' | 'Release' | 'LLMReasoner';

export interface Diagnostic {
  id: string;
  agent: AgentName;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  file: string;
  lineStart: number;
  lineEnd: number;
  flaggedSnippet: string;
  explanation: string;
  diagnosis: string;
  resolvedSnippet: string;
  remediation: string;
  /**
   * XAI provenance — which reasoning engine actually produced this
   * diagnostic. The HITL console can surface this so reviewers know
   * whether a finding came from the deterministic rule compiler, a
   * user-supplied .rego policy, or an LLM agent (and, if LLM, how
   * confident the model claims to be).
   */
  source?: 'deterministic' | 'opa' | 'rego-lite-fallback' | 'llm';
  confidence?: number;
}

export interface CostItem {
  resource: string;
  originalCost: number;
  optimizedCost: number;
  savings: number;
  details: string;
}

export interface CostSummary {
  originalCost: number;
  optimizedCost: number;
  monthlySavings: number;
  annualSavings: number;
  items: CostItem[];
  strategicSavings: {
    spotPrice: number;
    spotSavings: number;
    schedulePrice: number;
    scheduleSavings: number;
  };
}

export interface ReasoningLog {
  timestamp: string;
  agent: AgentName;
  message: string;
  details?: string;
}
