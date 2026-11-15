/**
 * Deployment Health Check
 * 
 * Kubernetes-ready readiness and liveness probes.
 * Provides /health/ready and /health/live endpoints.
 */

import { Injectable } from '@nitrostack/core';
import { AgentStateService } from '../realtime/agent-state.service.js';

@Injectable({ deps: [AgentStateService] })
export class DeploymentHealthCheck {
  private startTime = Date.now();

  constructor(private agentStateService: AgentStateService) {}

  /**
   * Readiness probe: checks if the service is ready to accept traffic
   */
  async checkReadiness(): Promise<{
    ready: boolean;
    reason?: string;
    details: Record<string, any>;
  }> {
    const status = this.agentStateService.getDeploymentStatus();

    return {
      ready: status.ready,
      reason: status.issues.length > 0 ? status.issues[0] : undefined,
      details: {
        uptime: status.uptime,
        agents: Object.entries(status.agents).map(([id, state]) => ({
          id,
          state: state.state,
          queueDepth: state.queueDepth,
          errorRate: state.errorRate
        })),
        issues: status.issues
      }
    };
  }

  /**
   * Liveness probe: checks if the service is still running.
   *
   * A failed liveness probe makes Kubernetes restart the pod, which here also wipes the
   * in-memory agent state and event log. So it fails only on a catastrophic state: every agent
   * has failed. A degraded agent or a high error rate is a readiness matter (stop routing
   * traffic here), not a reason to restart. It used to fail on any readiness issue (one failed
   * task out of two is enough to degrade an agent) and during the first 5 s after start, which
   * turned a flaky downstream into a restart loop.
   */
  async checkLiveness(): Promise<{
    alive: boolean;
    reason?: string;
    uptime: number;
  }> {
    const uptime = Date.now() - this.startTime;
    const agents = Object.values(this.agentStateService.getDeploymentStatus().agents);
    const allFailed = agents.length > 0 && agents.every(a => a.state === 'failed');

    return {
      alive: !allFailed,
      reason: allFailed ? 'Every agent has failed' : 'Service is running',
      uptime
    };
  }

  /**
   * Get detailed health metrics
   */
  async getMetrics(): Promise<{
    timestamp: number;
    uptime: number;
    status: string;
    agents: Record<string, any>;
    issues: string[];
  }> {
    const status = this.agentStateService.getDeploymentStatus();

    return {
      timestamp: Date.now(),
      uptime: status.uptime,
      status: status.healthy ? 'healthy' : status.ready ? 'degraded' : 'unhealthy',
      agents: status.agents,
      issues: status.issues
    };
  }
}
