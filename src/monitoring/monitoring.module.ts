/**
 * Monitoring Module
 * 
 * Registers monitoring tools for real-time agent status, deployment health,
 * and metrics collection.
 */

import { Module } from '@nitrostack/core';
import { MonitoringTools } from './monitoring.tools.js';

@Module({
  name: 'monitoring',
  description: 'Real-time monitoring and metrics collection',
  controllers: [MonitoringTools],
  providers: []
})
export class MonitoringModule {}
