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
   * Liveness probe: checks if the service is still running
   */
  async checkLiveness(): Promise<{
    alive: boolean;
    reason?: string;
    uptime: number;
  }> {
    const uptime = Date.now() - this.startTime;
    const status = this.agentStateService.getDeploymentStatus();

    // Service is alive if it's been running for at least 5 seconds
    // and hasn't had a catastrophic failure
    const alive = uptime > 5000 && status.healthy;

    return {
      alive,
      reason: alive ? 'Service is healthy' : 'Service is unhealthy',
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
