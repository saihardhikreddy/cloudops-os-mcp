/**
 * Unit tests for the agent state tracker behind the deployment status.
 */
// Same as event-log.test.ts: a pass-through @Injectable() instead of the ESM package.
jest.mock('@nitrostack/core', () => ({ Injectable: () => (target: unknown) => target }));

import { AgentStateService } from '../src/realtime/agent-state.service.js';

function service(): AgentStateService {
  return new AgentStateService({} as any, {} as any);
}

describe('AgentStateService', () => {
  it('keeps the queue depth in step when a queued task starts', () => {
    const s = service();
    s.enqueueTask('Release', 't1');
    expect(s.getAgentState('Release')!.queueDepth).toBe(1);
    s.startExecution('Release', 't1');
    expect(s.getAgentState('Release')!.queueDepth).toBe(0);
    expect(s.getAgentState('Release')!.state).toBe('executing');
    s.completeExecution('Release', 't1', 40);
    // The queue is empty, so the agent is idle, not 'queued'.
    expect(s.getAgentState('Release')!.state).toBe('idle');
  });

  it('stays queued while other tasks wait', () => {
    const s = service();
    s.enqueueTask('Release', 't1');
    s.enqueueTask('Release', 't2');
    s.startExecution('Release', 't1');
    s.completeExecution('Release', 't1', 10);
    expect(s.getAgentState('Release')!.state).toBe('queued');
    expect(s.getQueueDepth('Release')).toBe(1);
  });

  it('a success does not clear degradation while the error rate is still high', () => {
    const s = service();
    const run = (ok: boolean, id: string) => {
      s.startExecution('LLMReasoner', id);
      if (ok) s.completeExecution('LLMReasoner', id, 5);
      else s.failExecution('LLMReasoner', id, 'boom');
    };
    run(true, 'a');
    run(false, 'b'); // 1 of 2 failed
    expect(s.getAgentState('LLMReasoner')!.state).toBe('degraded');
    run(true, 'c'); // 1 of 3 failed: still 33%
    const st = s.getAgentState('LLMReasoner')!;
    expect(st.state).toBe('degraded');
    expect(st.errorRate).toBeCloseTo(1 / 3);
    expect(st.degradationReason).toBe('High error rate: 33.3%');
  });

  it('recovers once successes bring the error rate to 5% or less', () => {
    const s = service();
    s.startExecution('Release', 'f');
    s.failExecution('Release', 'f', 'boom');
    expect(s.getAgentState('Release')!.state).toBe('degraded');
    for (let i = 0; i < 18; i++) {
      s.startExecution('Release', `ok${i}`);
      s.completeExecution('Release', `ok${i}`, 5);
    }
    // 1 failure in 19 tasks is 5.3%: between the thresholds, so still degraded.
    expect(s.getAgentState('Release')!.state).toBe('degraded');
    s.startExecution('Release', 'last');
    s.completeExecution('Release', 'last', 5);
    // 1 in 20 is 5%: recovered, and the error rate the status reports has fallen too.
    const st = s.getAgentState('Release')!;
    expect(st.state).toBe('idle');
    expect(st.errorRate).toBeCloseTo(0.05);
    expect(st.degradationReason).toBeUndefined();
    expect(s.getDeploymentStatus().ready).toBe(true);
  });
});
