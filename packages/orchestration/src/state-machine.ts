import {
  Phase,
  PhaseEnum,
  PhaseTransition,
  StateMachine,
  StateMachineSchema,
  PHASE_TRANSITIONS,
} from '@apex/types';

export class StateMachineManager {
  private state: StateMachine;

  constructor() {
    this.state = {
      currentPhase: 'IDEA',
      history: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  getCurrentPhase(): Phase {
    return this.state.currentPhase;
  }

  getState(): StateMachine {
    return { ...this.state };
  }

  canTransitionTo(target: Phase): { allowed: boolean; reason?: string } {
    const current = this.state.currentPhase;
    const validTransitions = PHASE_TRANSITIONS[current];

    if (!validTransitions) {
      return { allowed: false, reason: `No transitions defined from ${current}` };
    }

    if (!validTransitions.to.includes(target)) {
      return {
        allowed: false,
        reason: `Cannot transition from ${current} to ${target}. Valid: ${validTransitions.to.join(', ')}`,
      };
    }

    return { allowed: true };
  }

  transitionTo(target: Phase, trigger: string): { success: boolean; error?: string } {
    const { allowed, reason } = this.canTransitionTo(target);
    if (!allowed) {
      return { success: false, error: reason };
    }

    const transition: PhaseTransition = {
      from: this.state.currentPhase,
      to: target,
      timestamp: new Date().toISOString(),
      trigger,
      guardCondition: PHASE_TRANSITIONS[this.state.currentPhase]?.guard,
    };

    this.state.history.push(transition);
    this.state.currentPhase = target;
    this.state.updatedAt = new Date().toISOString();

    return { success: true };
  }

  reset(): void {
    this.state = {
      currentPhase: 'IDEA',
      history: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  toJSON(): StateMachine {
    return StateMachineSchema.parse(this.state);
  }
}
