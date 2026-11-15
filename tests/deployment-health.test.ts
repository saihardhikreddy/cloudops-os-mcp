/**
 * Readiness and liveness probes.
 */
jest.mock('@nitrostack/core', () => ({ Injectable: () => (target: unknown) => target }));

import { DeploymentHealthCheck } from '../src/health/deployment.health.js';
import { AgentStateService } from '../src/realtime/agent-state.service.js';

function setup() {
  const agents = new AgentStateService({} as any, {} as any);
  return { agents, health: new DeploymentHealthCheck(agents) };
}

describe('DeploymentHealthCheck', () => {
  it('is alive and ready straight after start', async () => {
    const { health } = setup();
    expect((await health.checkLiveness()).alive).toBe(true);  // no 5 s window of "dead"
    expect((await health.checkReadiness()).ready).toBe(true);
  });

  it('a degraded agent makes it not ready, but stays alive (no restart loop)', async () => {
    const { agents, health } = setup();
    agents.startExecution('Release', 'a');
    agents.failExecution('Release', 'a', 'boom');
    expect(agents.getAgentState('Release')!.state).toBe('degraded');
    const ready = await health.checkReadiness();
    expect(ready.ready).toBe(false);
    expect(ready.reason).toMatch(/Release degraded/);
    expect((await health.checkLiveness()).alive).toBe(true);
    expect((await health.getMetrics()).status).toBe('unhealthy');
  });

  it('is not alive once every agent has failed', async () => {
    const { agents, health } = setup();
    const status = agents.getDeploymentStatus();
    for (const st of Object.values(status.agents)) st.state = 'failed';
    jest.spyOn(agents, 'getDeploymentStatus').mockReturnValue(status);
    const live = await health.checkLiveness();
    expect(live.alive).toBe(false);
    expect(live.reason).toBe('Every agent has failed');
  });
});
