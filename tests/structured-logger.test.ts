/**
 * Unit tests for the structured JSON logger.
 */
jest.mock('@nitrostack/core', () => ({ Injectable: () => (target: unknown) => target }));

import { StructuredLoggerService } from '../src/observability/structured-logger.service.js';

describe('StructuredLoggerService', () => {
  let out: jest.SpyInstance;
  let err: jest.SpyInstance;
  beforeEach(() => {
    out = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { out.mockRestore(); err.mockRestore(); });

  it('never writes to stdout, which carries the MCP stream over STDIO', () => {
    const logger = new StructuredLoggerService();
    logger.debug('d'); logger.info('i'); logger.warn('w'); logger.error('e'); logger.critical('c');
    expect(out).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledTimes(5);
    const levels = err.mock.calls.map(([line]) => JSON.parse(line).level);
    expect(levels).toEqual(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']);
  });

  it('keeps metadata, metrics and the error', () => {
    const logger = new StructuredLoggerService();
    const log = logger.warn('slow plan', {
      metadata: { resource: 'aws_s3_bucket.logs' },
      metrics: { latencyMs: 120 },
      error: new TypeError('boom'),
    });
    expect(log.metadata).toEqual({ resource: 'aws_s3_bucket.logs' });
    const line = JSON.parse(err.mock.calls[0][0]);
    expect(line.metadata).toEqual({ resource: 'aws_s3_bucket.logs' });
    expect(line.metrics).toEqual({ latencyMs: 120 });
    expect(line.error).toMatchObject({ name: 'TypeError', message: 'boom' });
    expect(logger.info('plain')).not.toHaveProperty('metadata');
  });

  it('nested spans share the trace and unwind in order', () => {
    const logger = new StructuredLoggerService();
    const root = logger.createTraceContext('user-1');
    const child = logger.pushSpan();
    expect(child.traceId).toBe(root.traceId);
    expect(child.correlationId).toBe(root.correlationId);
    expect(child.spanId).not.toBe(root.spanId);
    expect(logger.getCurrentContext().spanId).toBe(child.spanId);
    logger.popSpan();
    expect(logger.getCurrentContext().spanId).toBe(root.spanId);
  });
});
