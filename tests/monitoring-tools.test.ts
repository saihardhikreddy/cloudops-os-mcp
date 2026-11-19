/**
 * get_agent_status.
 */
jest.mock('@nitrostack/core', () => ({
  Injectable: () => (target: unknown) => target,
  ToolDecorator: () => () => undefined,
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
