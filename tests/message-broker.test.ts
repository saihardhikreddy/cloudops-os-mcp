/**
 * Unit tests for the in-memory pub/sub broker.
 */
jest.mock('@nitrostack/core', () => ({ Injectable: () => (target: unknown) => target }));

import { MessageBrokerService } from '../src/realtime/message-broker.service.js';
import type { EventLogEntry } from '../src/realtime/realtime.types.js';

const msg = (n: number): EventLogEntry =>
  ({ id: String(n), timestamp: n, correlationId: 'c', category: 'agent' as any, severity: 'info' as any, message: `m${n}` });

describe('MessageBrokerService', () => {
  let errorSpy: jest.SpyInstance;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => errorSpy.mockRestore());

  it('a limit of 0 or less returns no history', async () => {
    const b = new MessageBrokerService();
    for (let i = 0; i < 5; i++) await b.publish('ch', msg(i));
    expect(b.getHistory('ch', 2).map(m => m.id)).toEqual(['3', '4']);
    expect(b.getHistory('ch', 0)).toEqual([]);
    expect(b.getHistory('ch', -3)).toEqual([]);
    expect(b.getHistory('ch').length).toBe(5);
  });

  it('a subscriber added during a publish waits for the next message', async () => {
    const b = new MessageBrokerService();
    const late: string[] = [];
    b.subscribe('ch', () => { b.subscribe('ch', m => { late.push(m.id); }); });
    await b.publish('ch', msg(1));
    expect(late).toEqual([]);
    await b.publish('ch', msg(2));
    expect(late).toEqual(['2']);
  });

  it('a failing async subscriber is logged, not left as an unhandled rejection', async () => {
    const b = new MessageBrokerService();
    const seen: string[] = [];
    b.subscribe('ch', async () => { throw new Error('async boom'); });
    b.subscribe('ch', () => { throw new Error('sync boom'); });
    b.subscribe('ch', m => { seen.push(m.id); });
    await b.publish('ch', msg(7));
    await new Promise(r => setImmediate(r));
    expect(seen).toEqual(['7']);
    const logged = errorSpy.mock.calls.map(c => JSON.parse(c[0]).error);
    expect(logged).toEqual(expect.arrayContaining(['async boom', 'sync boom']));
  });

  it('unsubscribing stops delivery and drops the empty channel', async () => {
    const b = new MessageBrokerService();
    const got: string[] = [];
    const off = b.subscribe('ch', m => { got.push(m.id); });
    await b.publish('ch', msg(1));
    off();
    await b.publish('ch', msg(2));
    expect(got).toEqual(['1']);
    expect(b.getChannels()).toEqual([]);
  });
});
