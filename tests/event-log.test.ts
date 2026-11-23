/**
 * Unit tests for the in-memory event log behind the query_event_log tool.
 */
// The service only needs @nitrostack/core for its @Injectable() decorator, and that package
// ships ESM that this Jest setup doesn't transform; a pass-through decorator is enough here.
jest.mock('@nitrostack/core', () => ({ Injectable: () => (target: unknown) => target }));

import { EventLogServiceImpl } from '../src/realtime/event-log.service.js';
import type { EventLogEntry } from '../src/realtime/realtime.types.js';

function entry(correlationId: string, agent: string, severity = 'info', timestamp = 1000): EventLogEntry {
  return { id: '', timestamp, correlationId, category: 'agent' as any, severity: severity as any, agent, message: `${agent} ${correlationId}` };
}

describe('EventLogService', () => {
  it('filters by correlation id and agent together', async () => {
    const log = new EventLogServiceImpl();
    await log.append(entry('t1', 'ResourceRoute'));
    await log.append(entry('t1', 'LLMReasoner'));
    await log.append(entry('t2', 'LLMReasoner'));
    const both = await log.query({ correlationId: 't1', agent: 'LLMReasoner' });
    expect(both.map(e => e.message)).toEqual(['LLMReasoner t1']);
    expect((await log.query({ agent: 'LLMReasoner' })).length).toBe(2);
    expect((await log.query({ correlationId: 't1' })).length).toBe(2);
    expect(await log.query({ correlationId: 'nope' })).toEqual([]);
  });

  it('filters by severity and time and keeps the newest up to the limit', async () => {
    const log = new EventLogServiceImpl();
    for (let i = 0; i < 5; i++) await log.append(entry('t', 'A', i % 2 ? 'error' : 'info', 1000 + i));
    const errors = await log.query({ severity: 'error' });
    expect(errors.map(e => e.timestamp)).toEqual([1001, 1003]);
    expect((await log.query({ startTime: 1002, endTime: 1003 })).map(e => e.timestamp)).toEqual([1002, 1003]);
    expect((await log.query({ limit: 2 })).map(e => e.timestamp)).toEqual([1003, 1004]);
  });

  it('treats a time bound of 0 (the epoch) as a real bound', async () => {
    const log = new EventLogServiceImpl();
    for (const ts of [-2, -1, 0, 1, 2]) await log.append(entry('t', 'A', 'info', ts));
    expect((await log.query({ startTime: 0 })).map(e => e.timestamp)).toEqual([0, 1, 2]);
    expect((await log.query({ endTime: 0 })).map(e => e.timestamp)).toEqual([-2, -1, 0]);
  });

  it('query never returns more than a positive limit, and nothing for zero or less', async () => {
    const log = new EventLogServiceImpl();
    for (let i = 0; i < 10; i++) await log.append(entry('t', 'A', 'info', i));
    expect((await log.query({ limit: -5 }))).toEqual([]);      // used to return the newest 5
    expect((await log.query({ limit: 0 }))).toEqual([]);       // used to mean 100
    expect((await log.query({ limit: NaN }))).toEqual([]);
    expect((await log.query({ limit: 2.7 })).map(e => e.timestamp)).toEqual([8, 9]);
    expect((await log.query({ limit: 0.5 }))).toEqual([]);
    expect((await log.getLatest(0.5))).toEqual([]);           // floor(0.5) = 0; slice(-0) is all
    expect((await log.query({})).length).toBe(10);             // no limit: up to 100
  });

  it('getLatest(0) returns nothing, not the whole log', async () => {
    const log = new EventLogServiceImpl();
    for (let i = 0; i < 3; i++) await log.append(entry('t', 'A', 'info', i));
    expect(await log.getLatest(0)).toEqual([]);
    expect(await log.getLatest(-2)).toEqual([]);
    expect((await log.getLatest(2)).map(e => e.timestamp)).toEqual([1, 2]);
  });

  it('assigns ids and evicts the oldest past the cap, from the indexes too', async () => {
    const log = new EventLogServiceImpl();
    (log as any).maxEvents = 3;
    const id = await log.append(entry('first', 'Old'));
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    for (let i = 0; i < 3; i++) await log.append(entry('t', 'A'));
    expect(await log.query({ correlationId: 'first' })).toEqual([]);
    expect(log.getStats()).toMatchObject({ totalEvents: 3, correlationIds: 1, agents: 1 });
  });
});
