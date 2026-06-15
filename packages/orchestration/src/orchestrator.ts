import { StateMachineManager } from './state-machine.js';
import { ProfileSwitcher } from './profile-switcher.js';
import { HooksBridge } from './hooks-bridge.js';
import { TypedEventBus } from '@apex/events';
import { Phase, RuntimeProfile } from '@apex/types';

export interface OrchestratorStatus {
  phase: string;
  profile: string;
  history: unknown[];
  interactiveAllowed: boolean;
  envHooks: string | undefined;
}

export class Orchestrator {
  readonly stateMachine: StateMachineManager;
  readonly profileSwitcher: ProfileSwitcher;
  readonly hooks: HooksBridge;
  readonly eventBus: TypedEventBus;
  private phaseId: string;

  constructor(eventBus?: TypedEventBus) {
    this.eventBus = eventBus ?? new TypedEventBus();
    this.phaseId = `phase_${Date.now()}`;
    this.stateMachine = new StateMachineManager();
    this.profileSwitcher = new ProfileSwitcher();
    this.hooks = new HooksBridge(this.eventBus);

    this.hooks.register('phase:transition', async (event) => {
      if (event.profile === 'execution') {
        this.profileSwitcher.switchTo('execution');
      } else if (event.profile === 'review') {
        this.profileSwitcher.switchTo('review');
      }
    });
  }

  transitionToPhase(target: Phase, trigger: string): { success: boolean; error?: string } {
    const from = this.stateMachine.getCurrentPhase();
    const result = this.stateMachine.transitionTo(target, trigger);
    if (!result.success) return result;
    const switchedTo = this.profileSwitcher.getCurrentProfile();

    const profileMap: Record<string, RuntimeProfile> = {
      IDEA: 'interactive',
      DISCOVERY: 'interactive',
      PLANNING: 'interactive',
      APPROVED: 'interactive',
      COMPILED: 'execution',
      EXECUTING: 'execution',
      FAILED: 'interactive',
      REVIEW: 'review',
      ROLLBACK: 'execution',
      COMPLETE: 'review',
    };

    const newProfile = profileMap[target] ?? 'interactive';
    this.profileSwitcher.switchTo(newProfile);

    this.eventBus.emit('PhaseTransitioned', {
      version: '1.0',
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: 'orchestrator',
      correlationId: `phase_${this.phaseId}`,
      phaseId: this.phaseId,
      from,
      to: target,
      trigger,
    });

    this.eventBus.emit('ProfileSwitched', {
      version: '1.0',
      eventId: `evt_${Date.now()}_profile`,
      timestamp: new Date().toISOString(),
      source: 'orchestrator',
      correlationId: `profile_${newProfile}`,
      from: switchedTo,
      to: newProfile,
    });

    this.hooks.emit('phase:transition', {
      type: 'phase:transition',
      phase: target,
      profile: newProfile,
      payload: { trigger },
    });

    return { success: true };
  }

  getStatus(): OrchestratorStatus {
    return {
      phase: this.stateMachine.getCurrentPhase(),
      profile: this.profileSwitcher.getCurrentProfile(),
      history: this.stateMachine.getState().history,
      interactiveAllowed: this.profileSwitcher.isInteractiveAllowed(),
      envHooks: process.env.APEX_HOOK_PROFILE,
    };
  }

  reset(): void {
    this.stateMachine.reset();
    this.profileSwitcher.switchTo('interactive');
  }
}
