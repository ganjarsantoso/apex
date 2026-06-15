import { describe, it, expect } from 'vitest';
import { StateMachineManager } from '../state-machine.js';

describe('StateMachineManager', () => {
  it('starts in IDEA phase', () => {
    const sm = new StateMachineManager();
    expect(sm.getCurrentPhase()).toBe('IDEA');
  });

  it('transitions from IDEA to DISCOVERY', () => {
    const sm = new StateMachineManager();
    const result = sm.transitionTo('DISCOVERY', '/brainstorm');
    expect(result.success).toBe(true);
    expect(sm.getCurrentPhase()).toBe('DISCOVERY');
  });

  it('rejects invalid transitions', () => {
    const sm = new StateMachineManager();
    const result = sm.transitionTo('EXECUTING', 'skip');
    expect(result.success).toBe(false);
    expect(sm.getCurrentPhase()).toBe('IDEA');
  });

  it('tracks transition history', () => {
    const sm = new StateMachineManager();
    sm.transitionTo('DISCOVERY', '/brainstorm');
    sm.transitionTo('PLANNING', 'spec_complete');
    const state = sm.getState();
    expect(state.history).toHaveLength(2);
    expect(state.history[0].from).toBe('IDEA');
    expect(state.history[0].to).toBe('DISCOVERY');
  });

  it('resets to IDEA', () => {
    const sm = new StateMachineManager();
    sm.transitionTo('DISCOVERY', '/brainstorm');
    sm.reset();
    expect(sm.getCurrentPhase()).toBe('IDEA');
    expect(sm.getState().history).toHaveLength(0);
  });

  it('transitions from EXECUTING to FAILED', () => {
    const sm = new StateMachineManager();
    sm.transitionTo('DISCOVERY', '/brainstorm');
    sm.transitionTo('PLANNING', 'spec_complete');
    sm.transitionTo('APPROVED', 'user_approved');
    sm.transitionTo('COMPILED', '/compile');
    sm.transitionTo('EXECUTING', '/run');
    const result = sm.transitionTo('FAILED', 'task_failure');
    expect(result.success).toBe(true);
    expect(sm.getCurrentPhase()).toBe('FAILED');
  });

  it('transitions from FAILED to ROLLBACK', () => {
    const sm = new StateMachineManager();
    sm.transitionTo('DISCOVERY', '/brainstorm');
    sm.transitionTo('PLANNING', 'spec_complete');
    sm.transitionTo('APPROVED', 'user_approved');
    sm.transitionTo('COMPILED', '/compile');
    sm.transitionTo('EXECUTING', '/run');
    sm.transitionTo('FAILED', 'task_failure');
    const result = sm.transitionTo('ROLLBACK', '/rollback');
    expect(result.success).toBe(true);
    expect(sm.getCurrentPhase()).toBe('ROLLBACK');
  });

  it('rejects invalid transition from COMPLETE to FAILED', () => {
    const sm = new StateMachineManager();
    sm.transitionTo('DISCOVERY', '/brainstorm');
    sm.transitionTo('PLANNING', 'spec_complete');
    sm.transitionTo('APPROVED', 'user_approved');
    sm.transitionTo('COMPILED', '/compile');
    sm.transitionTo('EXECUTING', '/run');
    sm.transitionTo('REVIEW', '/review');
    sm.transitionTo('COMPLETE', 'all_pass');
    const result = sm.transitionTo('FAILED', 'late_failure');
    expect(result.success).toBe(false);
    expect(sm.getCurrentPhase()).toBe('COMPLETE');
  });
});
