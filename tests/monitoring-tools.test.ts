/**
 * get_agent_status.
 */
const mockSchemas: Record<string, any> = {};
jest.mock('@nitrostack/core', () => ({
  Injectable: () => (target: unknown) => target,
  ToolDecorator: (opts: { name: string; inputSchema: unknown }) => {
    mockSchemas[opts.name] = opts.inputSchema;
    return () => undefined;
  },
  Widget: () => () => undefined,
  z: require('zod').z,
}));

import { MonitoringTools } from '../src/monitoring/monitoring.tools.js';
import { AgentStateService } from '../src/realtime/agent-state.service.js';

const ctx = { logger: { info: () => undefined } } as any;

function setup() {
  const agents = new AgentStateService({} as any, {} as any);
  return new MonitoringTools(agents, {} as any, {} as any);
}

describe('MonitoringTools.getAgentStatus', () => {
  it('filters to one known agent', async () => {
    const tools = setup();
    const all = await tools.getAgentStatus({}, ctx);
    const id = all.agents[0].id;
    const one = await tools.getAgentStatus({ agent_id: id }, ctx);
    expect(one.agents.map(a => a.id)).toEqual([id]);
    expect(one.summary.totalAgents).toBe(1);
  });

  it('names the known agents for an unknown id instead of crashing on undefined', async () => {
    const tools = setup();
    const all = await tools.getAgentStatus({}, ctx);
    await expect(tools.getAgentStatus({ agent_id: 'Nope' }, ctx)).rejects.toThrow(
      `Unknown agent "Nope". Known agents: ${all.agents.map(a => a.id).join(', ')}`
    );
  });
});

describe('get_event_log input', () => {
  it('takes a whole-number limit from 1 to 1000, 50 by default', () => {
    const schema = mockSchemas['get_event_log'];
    expect(schema.parse({}).limit).toBe(50);
    expect(schema.parse({ limit: 1000 }).limit).toBe(1000);
    for (const bad of [0, -5, 2.5, 1001]) {
      expect(schema.safeParse({ limit: bad }).success).toBe(false);  // 0 used to mean 50
    }
  });
});
