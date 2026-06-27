/**
 * Structured Logger Service
 * 
 * JSON-formatted logging with correlation IDs, trace context,
 * and metrics for observability and debugging.
 */

import { Injectable } from '@nitrostack/core';
import type { LogContext, StructuredLog } from './observability.types.js';
import { randomUUID } from 'crypto';

@Injectable()
export class StructuredLoggerService {
  private correlationIdStack: string[] = [];
  private traceIdStack: string[] = [];
  private spanIdStack: string[] = [];

  /**
   * Create a new trace context
   */
  createTraceContext(userId?: string, requestId?: string): LogContext {
    const correlationId = randomUUID();
    const traceId = randomUUID();
    const spanId = randomUUID();

    this.correlationIdStack.push(correlationId);
    this.traceIdStack.push(traceId);
    this.spanIdStack.push(spanId);

    return {
      correlationId,
      traceId,
      spanId,
      userId,
      requestId
    };
  }

  /**
   * Get current trace context
   */
  getCurrentContext(): LogContext {
    return {
      correlationId: this.correlationIdStack[this.correlationIdStack.length - 1] || randomUUID(),
      traceId: this.traceIdStack[this.traceIdStack.length - 1] || randomUUID(),
      spanId: this.spanIdStack[this.spanIdStack.length - 1] || randomUUID()
    };
  }

  /**
   * Push a new span onto the stack
   */
  pushSpan(parentContext?: LogContext): LogContext {
    const context = parentContext || this.getCurrentContext();
    const spanId = randomUUID();

    this.correlationIdStack.push(context.correlationId);
    this.traceIdStack.push(context.traceId);
    this.spanIdStack.push(spanId);

    return {
      ...context,
      spanId
    };
  }

  /**
   * Pop the current span
   */
  popSpan(): void {
    this.correlationIdStack.pop();
    this.traceIdStack.pop();
    this.spanIdStack.pop();
  }

  /**
   * Log a structured message
   */
  log(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL',
    message: string,
    options?: {
      context?: LogContext;
      error?: Error;
      metrics?: Record<string, any>;
      metadata?: Record<string, any>;
    }
  ): StructuredLog {
    const context = options?.context || this.getCurrentContext();

    const log: StructuredLog = {
      timestamp: Date.now(),
      level,
      message,
      context,
      metrics: options?.metrics as any
    };

    if (options?.error) {
      log.error = {
        name: options.error.name,
        message: options.error.message,
        stack: options.error.stack
      };
    }

    // Emit to stdout as newline-delimited JSON for log aggregators
    const consoleFn =
      level === 'ERROR' || level === 'CRITICAL' ? console.error : console.log;
    consoleFn(JSON.stringify(log));

    return log;
  }

  debug(message: string, options?: any): StructuredLog {
    return this.log('DEBUG', message, options);
  }

  info(message: string, options?: any): StructuredLog {
    return this.log('INFO', message, options);
  }

  warn(message: string, options?: any): StructuredLog {
    return this.log('WARN', message, options);
  }

  error(message: string, options?: any): StructuredLog {
    return this.log('ERROR', message, options);
  }

  critical(message: string, options?: any): StructuredLog {
    return this.log('CRITICAL', message, options);
  }
}
