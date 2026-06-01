/**
 * Real-Time Infrastructure Module
 * 
 * Registers event log, message broker, and agent state services
 * for real-time agent synchronization and monitoring.
 */

import { Module } from '@nitrostack/core';
import { MessageBrokerService } from './message-broker.service.js';
import { EventLogServiceImpl } from './event-log.service.js';
import { AgentStateService } from './agent-state.service.js';

@Module({
  name: 'realtime',
  description: 'Real-time event infrastructure for agent state synchronization',
  controllers: [],
  providers: [
    MessageBrokerService,
    EventLogServiceImpl,
    AgentStateService
  ]
})
export class RealtimeModule {}
