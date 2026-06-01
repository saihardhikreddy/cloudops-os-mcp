/**
 * Real-Time Event Infrastructure Types
 * 
 * Defines the core event model, message broker contracts, and WebSocket
 * gateway protocols for real-time agent state synchronization.
 */

export type EventSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type EventCategory = 'agent' | 'llm' | 'tool' | 'system' | 'deployment' | 'health';
export type AgentState = 'idle' | 'queued' | 'executing' | 'streaming' | 'completed' | 'failed' | 'degraded';

/**
 * Core Event Log Entry
 * Immutable, append-only event record for audit trail and real-time streaming.
 */
export interface EventLogEntry {
  id: string;                          // UUID v4
  timestamp: number;                   // Unix milliseconds
  correlationId: string;               // Trace ID for distributed tracing
  category: EventCategory;
  severity: EventSeverity;
  agent?: string;                      // Agent name (e.g., 'ResourceRoute', 'LLMReasoner')
  tool?: string;                       // Tool name (e.g., 'analyze_terraform')
  message: string;
  metadata?: Record<string, any>;      // Structured context (latency, tokens, cost, etc.)
  parentEventId?: string;              // For event causality chains
}

/**
 * Agent Execution State
 * Tracks real-time agent status, queue depth, and performance metrics.
 */
export interface AgentExecutionState {
  agentId: string;
  state: AgentState;
  currentTaskId?: string;
  queueDepth: number;
  activeCount: number;
  totalProcessed: number;
  totalFailed: number;
  averageLatencyMs: number;
  lastHeartbeat: number;               // Unix milliseconds
  errorRate: number;                   // 0.0 - 1.0
  degradationReason?: string;          // Why agent is degraded
}

/**
 * LLM Streaming State
 * Tracks token usage, latency, and streaming progress.
 */
export interface LLMStreamingState {
  requestId: string;
  provider: 'openrouter' | 'groq' | 'fallback';
  model: string;
  state: 'pending' | 'streaming' | 'completed' | 'failed';
  tokensUsed: number;
  tokensRemaining: number;
  estimatedCost: number;
  latencyMs: number;
  streamedChunks: number;
  error?: string;
}

/**
 * Deployment Status Snapshot
 * Real-time health and readiness state for Kubernetes probes.
 */
export interface DeploymentStatus {
  ready: boolean;
  healthy: boolean;
  version: string;
  uptime: number;                      // Milliseconds
  agents: Record<string, AgentExecutionState>;
  llmState?: LLMStreamingState;
  lastCheck: number;
  issues: string[];                    // Critical issues blocking readiness
}

/**
 * WebSocket Message Protocol
 * Bidirectional message format for real-time updates.
 */
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'event' | 'state-update' | 'ping' | 'pong' | 'error';
  channel?: string;                    // 'events', 'agent-state', 'llm-state', 'deployment'
  payload?: any;
  timestamp: number;
  requestId?: string;
}

/**
 * Message Broker Contract
 * Abstraction for pub/sub event distribution (Redis, in-memory, etc.).
 */
export interface MessageBroker {
  publish(channel: string, message: EventLogEntry): Promise<void>;
  subscribe(channel: string, handler: (msg: EventLogEntry) => void): () => void;
  getChannels(): string[];
  close(): Promise<void>;
}

/**
 * Event Log Service Contract
 * Append-only, queryable event store.
 */
export interface EventLogService {
  append(entry: EventLogEntry): Promise<string>;
  query(filters: {
    correlationId?: string;
    agent?: string;
    severity?: EventSeverity;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<EventLogEntry[]>;
  getLatest(count: number): Promise<EventLogEntry[]>;
  close(): Promise<void>;
}

/**
 * Real-Time Gateway Contract
 * WebSocket server for pushing live updates to UI.
 */
export interface RealtimeGateway {
  start(port: number): Promise<void>;
  broadcast(message: WebSocketMessage): void;
  broadcastToChannel(channel: string, message: WebSocketMessage): void;
  getConnectedClients(): number;
  close(): Promise<void>;
}
