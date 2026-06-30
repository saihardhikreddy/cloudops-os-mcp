/**
 * Agent State Manager Service
 * 
 * Tracks real-time agent execution state, queue depth, health metrics,
 * and graceful degradation triggers.
 */

import { Injectable } from '@nitrostack/core';
import type { AgentExecutionState, DeploymentStatus } from './realtime.types.js';
import { MessageBrokerService } from './message-broker.service.js';
import { EventLogServiceImpl } from './event-log.service.js';

interface AgentMetrics {
  totalProcessed: number;
  totalFailed: number;
  latencies: number[];
  lastHeartbeat: number;
}

@Injectable({ deps: [MessageBrokerService, EventLogServiceImpl] })
export class AgentStateService {
  private agentStates: Map<string, AgentExecutionState> = new Map();
  private agentMetrics: Map<string, AgentMetrics> = new Map();
  private taskQueues: Map<string, string[]> = new Map();
  private startTime = Date.now();

  constructor(
    private messageBroker: MessageBrokerService,
    private eventLog: EventLogServiceImpl
  ) {
    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents(): void {
    const agents = [
      'ResourceRoute',
      'CostOptimization',
      'PolicyGovernance',
      'Release',
      'LLMReasoner'
    ];

    agents.forEach(agentId => {
      this.agentStates.set(agentId, {
        agentId,
        state: 'idle',
        queueDepth: 0,
        activeCount: 0,
        totalProcessed: 0,
        totalFailed: 0,
        averageLatencyMs: 0,
        lastHeartbeat: Date.now(),
        errorRate: 0
      });

      this.agentMetrics.set(agentId, {
        totalProcessed: 0,
        totalFailed: 0,
        latencies: [],
        lastHeartbeat: Date.now()
      });

      this.taskQueues.set(agentId, []);
    });
  }

  /**
   * Enqueue a task for an agent
   */
  enqueueTask(agentId: string, taskId: string): void {
    const queue = this.taskQueues.get(agentId);
    if (queue) {
      queue.push(taskId);
      const state = this.agentStates.get(agentId);
      if (state) {
        state.queueDepth = queue.length;
        state.state = queue.length > 0 ? 'queued' : 'idle';
      }
    }
  }

  /**
   * Mark agent as executing a task
   */
  startExecution(agentId: string, taskId: string): void {
    const state = this.agentStates.get(agentId);
    if (state) {
      state.state = 'executing';
      state.currentTaskId = taskId;
      state.activeCount++;
      state.lastHeartbeat = Date.now();
    }

    const queue = this.taskQueues.get(agentId);
    if (queue) {
      const idx = queue.indexOf(taskId);
      if (idx >= 0) queue.splice(idx, 1);
    }
  }

  /**
   * Mark task as completed with latency
   */
  completeExecution(agentId: string, taskId: string, latencyMs: number): void {
    const state = this.agentStates.get(agentId);
    const metrics = this.agentMetrics.get(agentId);

    if (state && metrics) {
      state.activeCount = Math.max(0, state.activeCount - 1);
      state.totalProcessed++;
      metrics.totalProcessed++;
      metrics.latencies.push(latencyMs);

      // Keep only last 100 latencies for average calculation
      if (metrics.latencies.length > 100) {
        metrics.latencies.shift();
      }

      state.averageLatencyMs = Math.round(
        metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
      );

      state.lastHeartbeat = Date.now();
      state.state = state.queueDepth > 0 ? 'queued' : 'idle';
    }
  }

  /**
   * Mark task as failed
   */
  failExecution(agentId: string, taskId: string, error: string): void {
    const state = this.agentStates.get(agentId);
    const metrics = this.agentMetrics.get(agentId);

    if (state && metrics) {
      state.activeCount = Math.max(0, state.activeCount - 1);
      state.totalFailed++;
      metrics.totalFailed++;

      const total = metrics.totalProcessed + metrics.totalFailed;
      state.errorRate = total > 0 ? metrics.totalFailed / total : 0;

      // Trigger degradation if error rate exceeds 10% (lowered from 20%)
      if (state.errorRate > 0.1 && state.state !== 'degraded') {
        state.state = 'degraded';
        state.degradationReason = `High error rate: ${(state.errorRate * 100).toFixed(1)}%`;
      } else if (state.errorRate <= 0.05 && state.state === 'degraded') {
        // Auto-recover: error rate has dropped below 5% threshold
        state.state = state.queueDepth > 0 ? 'queued' : 'idle';
        state.degradationReason = undefined;
      }

      state.lastHeartbeat = Date.now();
    }
  }

  /**
   * Get current state of an agent
   */
  getAgentState(agentId: string): AgentExecutionState | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * Get all agent states
   */
  getAllAgentStates(): Record<string, AgentExecutionState> {
    const result: Record<string, AgentExecutionState> = {};
    this.agentStates.forEach((state, agentId) => {
      result[agentId] = { ...state };
    });
    return result;
  }

  /**
   * Get deployment status snapshot
   */
  getDeploymentStatus(): DeploymentStatus {
    const agents = this.getAllAgentStates();
    const issues: string[] = [];

    // Check for degraded agents
    Object.values(agents).forEach(agent => {
      if (agent.state === 'degraded') {
        issues.push(`Agent ${agent.agentId} degraded: ${agent.degradationReason}`);
      }
      if (agent.errorRate > 0.1) {
        issues.push(`Agent ${agent.agentId} error rate: ${(agent.errorRate * 100).toFixed(1)}%`);
      }
    });

    const ready = issues.length === 0;
    const healthy = ready && Object.values(agents).every(a => a.state !== 'failed');

    return {
      ready,
      healthy,
      version: '1.0.0',
      uptime: Date.now() - this.startTime,
      agents,
      lastCheck: Date.now(),
      issues
    };
  }

  /**
   * Reset agent state (for testing or recovery)
   */
  resetAgent(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (state) {
      state.state = 'idle';
      state.currentTaskId = undefined;
      state.activeCount = 0;
      state.queueDepth = 0;
      state.degradationReason = undefined;
    }

    const queue = this.taskQueues.get(agentId);
    if (queue) {
      queue.length = 0;
    }
  }

  /**
   * Get queue depth for an agent
   */
  getQueueDepth(agentId: string): number {
    const queue = this.taskQueues.get(agentId);
    return queue ? queue.length : 0;
  }
}
