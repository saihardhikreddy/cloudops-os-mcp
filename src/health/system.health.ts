import { HealthCheck, HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';

/**
 * System Health Check
 * 
 * Monitors system resources and uptime
 */
@HealthCheck({ 
  name: 'system', 
  description: 'System resource and uptime check',
  interval: 30 // Check every 30 seconds
})
export class SystemHealthCheck implements HealthCheckInterface {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = Date.now() - this.startTime;
      const uptimeSeconds = Math.floor(uptime / 1000);

      // Convert memory to MB
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
      const externalMB = Math.round(memoryUsage.external / 1024 / 1024);

      // Consider unhealthy if heap usage exceeds 90%
      const heapPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const isHealthy = heapPercent < 90;

      return {
        status: isHealthy ? 'up' : 'degraded',
        message: isHealthy
          ? 'System is healthy'
          : `High heap usage: ${Math.round(heapPercent)}%`,
        details: {
          uptime: `${uptimeSeconds}s`,
          heap: `${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(heapPercent)}%)`,
          rss: `${rssMB}MB`,
          external: `${externalMB}MB`,
          pid: process.pid,
          nodeVersion: process.version,
        },
      };
    } catch (error: any) {
      return {
        status: 'down',
        message: 'System health check failed',
        details: error.message,
      };
    }
  }
}

