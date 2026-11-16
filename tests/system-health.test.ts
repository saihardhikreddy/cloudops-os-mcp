/**
 * System health check: heap usage is judged against V8's heap limit.
 */
jest.mock('@nitrostack/core', () => ({ HealthCheck: () => (target: unknown) => target }));

import { getHeapStatistics } from 'v8';
import { SystemHealthCheck } from '../src/health/system.health.js';

const MB = 1024 * 1024;

function withMemory(heapUsed: number, heapTotal: number) {
  return jest.spyOn(process, 'memoryUsage').mockReturnValue({
    rss: 200 * MB, heapUsed, heapTotal, external: 2 * MB, arrayBuffers: 0,
  } as NodeJS.MemoryUsage);
}

afterEach(() => jest.restoreAllMocks());

describe('SystemHealthCheck', () => {
  it('is up when the heap is nearly all of what V8 has reserved so far', async () => {
    // 95 % of heapTotal is how an idle Node process usually looks; it used to read "degraded".
    withMemory(95 * MB, 100 * MB);
    const result = await new SystemHealthCheck().check();
    expect(result.status).toBe('up');
    expect((result.details as any).heap).toMatch(/95MB used, 100MB reserved, limit \d+MB/);
  });

  it('is degraded when the heap nears its limit', async () => {
    const limit = getHeapStatistics().heap_size_limit;
    withMemory(Math.round(limit * 0.95), limit);
    const result = await new SystemHealthCheck().check();
    expect(result.status).toBe('degraded');
    expect(result.message).toMatch(/High heap usage: 95% of the \d+MB limit/);
  });
});
