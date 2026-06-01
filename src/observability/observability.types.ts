/**
 * Observability Types
 * 
 * Structured logging, correlation IDs, and OpenTelemetry stubs
 * for distributed tracing and monitoring.
 */

export interface LogContext {
  correlationId: string;
  traceId: string;
  spanId: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface StructuredLog {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metrics?: {
    latencyMs?: number;
    tokensUsed?: number;
    cost?: number;
    queueDepth?: number;
  };
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: 'UNSET' | 'OK' | 'ERROR';
  attributes?: Record<string, any>;
  events?: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }>;
}

export interface MetricsSnapshot {
  timestamp: number;
  agentMetrics: Record<string, {
    queueDepth: number;
    activeCount: number;
    errorRate: number;
    averageLatencyMs: number;
  }>;
  llmMetrics?: {
    tokensUsed: number;
    tokensRemaining: number;
    estimatedCost: number;
    averageLatencyMs: number;
  };
  systemMetrics?: {
    memoryUsageMb: number;
    cpuUsagePercent: number;
    uptime: number;
  };
}
