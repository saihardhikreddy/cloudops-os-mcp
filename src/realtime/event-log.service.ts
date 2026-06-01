/**
 * Event Log Service
 * 
 * Append-only, queryable event store for audit trail and real-time streaming.
 * Supports filtering by correlation ID, agent, severity, and time range.
 */

import { Injectable } from '@nitrostack/core';
import type { EventLogService, EventLogEntry } from './realtime.types.js';
import { randomUUID } from 'crypto';

@Injectable()
export class EventLogServiceImpl implements EventLogService {
  private events: EventLogEntry[] = [];
  private readonly maxEvents = 10000;
  private indexByCorrelationId: Map<string, EventLogEntry[]> = new Map();
  private indexByAgent: Map<string, EventLogEntry[]> = new Map();

  async append(entry: EventLogEntry): Promise<string> {
    // Ensure entry has an ID
    if (!entry.id) {
      entry.id = randomUUID();
    }

    // Add to main log
    this.events.push(entry);

    // Maintain size limit (FIFO eviction)
    if (this.events.length > this.maxEvents) {
      const removed = this.events.shift()!;
      this.removeFromIndices(removed);
    }

    // Update indices
    if (entry.correlationId) {
      if (!this.indexByCorrelationId.has(entry.correlationId)) {
        this.indexByCorrelationId.set(entry.correlationId, []);
      }
      this.indexByCorrelationId.get(entry.correlationId)!.push(entry);
    }

    if (entry.agent) {
      if (!this.indexByAgent.has(entry.agent)) {
        this.indexByAgent.set(entry.agent, []);
      }
      this.indexByAgent.get(entry.agent)!.push(entry);
    }

    return entry.id;
  }

  async query(filters: {
    correlationId?: string;
    agent?: string;
    severity?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<EventLogEntry[]> {
    let results = this.events;

    // Apply correlation ID filter (fast path via index)
    if (filters.correlationId) {
      results = this.indexByCorrelationId.get(filters.correlationId) || [];
    }

    // Apply agent filter (fast path via index)
    if (filters.agent && !filters.correlationId) {
      results = this.indexByAgent.get(filters.agent) || [];
    }

    // Apply remaining filters
    results = results.filter(e => {
      if (filters.severity && e.severity !== filters.severity) return false;
      if (filters.startTime && e.timestamp < filters.startTime) return false;
      if (filters.endTime && e.timestamp > filters.endTime) return false;
      return true;
    });

    // Apply limit
    const limit = filters.limit || 100;
    return results.slice(-limit);
  }

  async getLatest(count: number): Promise<EventLogEntry[]> {
    return this.events.slice(-count);
  }

  private removeFromIndices(entry: EventLogEntry): void {
    if (entry.correlationId) {
      const list = this.indexByCorrelationId.get(entry.correlationId);
      if (list) {
        const idx = list.indexOf(entry);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) this.indexByCorrelationId.delete(entry.correlationId);
      }
    }

    if (entry.agent) {
      const list = this.indexByAgent.get(entry.agent);
      if (list) {
        const idx = list.indexOf(entry);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) this.indexByAgent.delete(entry.agent);
      }
    }
  }

  async close(): Promise<void> {
    this.events = [];
    this.indexByCorrelationId.clear();
    this.indexByAgent.clear();
  }
}
