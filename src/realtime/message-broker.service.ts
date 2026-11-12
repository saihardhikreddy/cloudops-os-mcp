/**
 * In-Memory Message Broker Service
 * 
 * Pub/sub event distribution for real-time agent state synchronization.
 * Production deployments can swap this for Redis or RabbitMQ.
 */

import { Injectable } from '@nitrostack/core';
import type { MessageBroker, EventLogEntry } from './realtime.types.js';

type SubscriptionHandler = (msg: EventLogEntry) => void | Promise<void>;

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

    // Dispatch to a snapshot of the subscribers: a handler that subscribes another one to
    // this channel used to have the newcomer called with the same message straight away.
    const handlers = Array.from(this.subscriptions.get(channel) ?? []);
    for (const handler of handlers) {
      try {
        const result: unknown = handler(message);
        // An async handler's rejection escaped the try/catch as an unhandled rejection,
        // which can stop the Node process; log it like a synchronous throw.
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
          (result as Promise<unknown>).catch((err) => this.logHandlerError(channel, err));
        }
      } catch (err) {
        // Log but don't rethrow — one broken subscriber must not block others
        this.logHandlerError(channel, err);
      }
    }
  }

  private logHandlerError(channel: string, err: unknown): void {
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
    // slice(-0) is the whole array, so a limit of 0 used to return all 1000 messages.
    if (!(limit > 0)) return [];
    const history = this.messageHistory.get(channel) || [];
    return history.slice(-Math.floor(limit));
  }

  async close(): Promise<void> {
    this.subscriptions.clear();
    this.messageHistory.clear();
  }
}
