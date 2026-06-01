import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { TerraformModule } from './modules/terraform/terraform.module.js';
import { SystemHealthCheck } from './health/system.health.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { DeploymentHealthCheck } from './health/deployment.health.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'cloudops-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    TerraformModule,
    RealtimeModule,
    MonitoringModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
    DeploymentHealthCheck
  ]
})
export class AppModule {}

