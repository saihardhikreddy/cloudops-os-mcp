/**
 * In-Memory Message Broker Service
 * 
 * Pub/sub event distribution for real-time agent state synchronization.
 * Production deployments can swap this for Redis or RabbitMQ.
 */

import { Injectable } from '@nitrostack/core';
import type { MessageBroker, EventLogEntry } from './realtime.types.js';

type SubscriptionHandler = (msg: EventLogEntry) => void;

@Injectable()
export class MessageBrokerService implements MessageBroker {
  private subscriptions: Map<string, Set<SubscriptionHandler>> = new Map();
  private messageHistory: Map<string, EventLogEntry[]> = new Map();
  private readonly maxHistoryPerChannel = 1000;

  async publish(channel: string, message: EventLogEntry): Promise<void> {
    // Store in history
    if (!this.messageHistory.has(channel)) {
      this.messageHistory.set(channel, []);
    }
    const history = this.messageHistory.get(channel)!;
    history.push(message);
    if (history.length > this.maxHistoryPerChannel) {
      history.shift();
    }

    // Dispatch to subscribers
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (err) {
          // Log but don't rethrow — one broken subscriber must not block others
          console.error(
            JSON.stringify({
              level: 'ERROR',
              timestamp: Date.now(),
              message: 'MessageBroker: subscriber handler threw an error',
              channel,
              error: err instanceof Error ? err.message : String(err),
            })
          );
        }
      });
    }
  }

  subscribe(channel: string, handler: SubscriptionHandler): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    };
  }

  getChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  getHistory(channel: string, limit: number = 100): EventLogEntry[] {
    const history = this.messageHistory.get(channel) || [];
    return history.slice(-limit);
  }

  async close(): Promise<void> {
    this.subscriptions.clear();
    this.messageHistory.clear();
  }
}
