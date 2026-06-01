/**
 * Monitoring Tools
 * 
 * Real-time monitoring endpoints for agent status, metrics, and deployment health.
 */

import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { AgentStateService } from '../realtime/agent-state.service.js';
import { EventLogServiceImpl } from '../realtime/event-log.service.js';
import { DeploymentHealthCheck } from '../health/deployment.health.js';
import { Injectable } from '@nitrostack/core';

@Injectable({ deps: [AgentStateService, EventLogServiceImpl, DeploymentHealthCheck] })
export class MonitoringTools {
  constructor(
    private agentStateService: AgentStateService,
    private eventLogService: EventLogServiceImpl,
    private deploymentHealthCheck: DeploymentHealthCheck
  ) {}

  @Tool({
    name: 'get_agent_status',
    description: 'Get real-time status of all agents including queue depth, error rates, and execution state',
    inputSchema: z.object({
      agent_id: z.string().optional().describe('Optional: filter by specific agent ID')
    })
  })
  @Widget('agent-status-dashboard')
  async getAgentStatus(input: { agent_id?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching agent status', { agentId: input.agent_id });

    const allStates = this.agentStateService.getAllAgentStates();
    const states = input.agent_id
      ? { [input.agent_id]: allStates[input.agent_id] }
      : allStates;

    const agents = Object.entries(states).map(([id, state]) => ({
      id,
      state: state.state,
      queueDepth: state.queueDepth,
      activeCount: state.activeCount,
      totalProcessed: state.totalProcessed,
      totalFailed: state.totalFailed,
      errorRate: (state.errorRate * 100).toFixed(2) + '%',
      averageLatencyMs: state.averageLatencyMs,
      lastHeartbeat: new Date(state.lastHeartbeat).toISOString(),
      degradationReason: state.degradationReason
    }));

    return {
      timestamp: new Date().toISOString(),
      agents,
      summary: {
        totalAgents: agents.length,
        healthyAgents: agents.filter(a => a.state !== 'degraded' && a.state !== 'failed').length,
        degradedAgents: agents.filter(a => a.state === 'degraded').length,
        failedAgents: agents.filter(a => a.state === 'failed').length
      }
    };
  }

  @Tool({
    name: 'get_deployment_health',
    description: 'Get deployment health status including readiness and liveness probe results',
    inputSchema: z.object({})
  })
  @Widget('deployment-health-panel')
  async getDeploymentHealth(input: {}, ctx: ExecutionContext) {
    ctx.logger.info('Fetching deployment health');

    const readiness = await this.deploymentHealthCheck.checkReadiness();
    const liveness = await this.deploymentHealthCheck.checkLiveness();
    const metrics = await this.deploymentHealthCheck.getMetrics();

    return {
      timestamp: new Date().toISOString(),
      readiness: {
        ready: readiness.ready,
        reason: readiness.reason,
        details: readiness.details
      },
      liveness: {
        alive: liveness.alive,
        reason: liveness.reason,
        uptime: liveness.uptime
      },
      metrics: {
        status: metrics.status,
        uptime: metrics.uptime,
        agents: metrics.agents,
        issues: metrics.issues
      }
    };
  }

  @Tool({
    name: 'get_event_log',
    description: 'Query the event log with optional filters for correlation ID, agent, severity, and time range',
    inputSchema: z.object({
      correlation_id: z.string().optional().describe('Filter by correlation ID'),
      agent: z.string().optional().describe('Filter by agent name'),
      severity: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']).optional().describe('Filter by severity level'),
      limit: z.number().optional().default(50).describe('Maximum number of events to return')
    })
  })
  @Widget('event-log-viewer')
  async getEventLog(
    input: {
      correlation_id?: string;
      agent?: string;
      severity?: string;
      limit?: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Querying event log', {
      correlationId: input.correlation_id,
      agent: input.agent,
      severity: input.severity
    });

    const events = await this.eventLogService.query({
      correlationId: input.correlation_id,
      agent: input.agent,
      severity: input.severity,
      limit: input.limit || 50
    });

    return {
      timestamp: new Date().toISOString(),
      count: events.length,
      events: events.map(e => ({
        id: e.id,
        timestamp: new Date(e.timestamp).toISOString(),
        correlationId: e.correlationId,
        category: e.category,
        severity: e.severity,
        agent: e.agent,
        tool: e.tool,
        message: e.message,
        metadata: e.metadata
      }))
    };
  }

  @Tool({
    name: 'get_metrics_snapshot',
    description: 'Get a snapshot of current system metrics including agent performance and resource usage',
    inputSchema: z.object({})
  })
  @Widget('metrics-snapshot')
  async getMetricsSnapshot(input: {}, ctx: ExecutionContext) {
    ctx.logger.info('Fetching metrics snapshot');

    const agentStates = this.agentStateService.getAllAgentStates();
    const deploymentStatus = this.agentStateService.getDeploymentStatus();

    const agentMetrics: Record<string, any> = {};
    Object.entries(agentStates).forEach(([id, state]) => {
      agentMetrics[id] = {
        queueDepth: state.queueDepth,
        activeCount: state.activeCount,
        errorRate: state.errorRate,
        averageLatencyMs: state.averageLatencyMs,
        totalProcessed: state.totalProcessed,
        totalFailed: state.totalFailed
      };
    });

    return {
      timestamp: Date.now(),
      agentMetrics,
      deploymentStatus: {
        ready: deploymentStatus.ready,
        healthy: deploymentStatus.healthy,
        uptime: deploymentStatus.uptime,
        issues: deploymentStatus.issues
      },
      systemMetrics: {
        memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime: process.uptime()
      }
    };
  }
}
