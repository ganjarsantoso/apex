import {
  RuntimeProfile,
  RuntimeProfileConfig,
  CapabilityProfile,
  PROFILES,
} from '@apex/types';
import { HOOK_PROFILES } from '@apex/shared';

export class ProfileSwitcher {
  private currentProfile: RuntimeProfile = 'interactive';
  private envBackup: Record<string, string | undefined> = {};

  getCurrentProfile(): RuntimeProfile {
    return this.currentProfile;
  }

  getProfileConfig(profile?: RuntimeProfile): RuntimeProfileConfig {
    const name = profile ?? this.currentProfile;
    return { ...PROFILES[name] };
  }

  switchTo(profile: RuntimeProfile): void {
    const config = PROFILES[profile];
    this.currentProfile = profile;
    this.applyEnvironment(config);
  }

  private applyEnvironment(config: RuntimeProfileConfig): void {
    this.envBackup = {
      APEX_HOOK_PROFILE: process.env.APEX_HOOK_PROFILE,
      APEX_DISABLED_HOOKS: process.env.APEX_DISABLED_HOOKS,
      APEX_PHASE: process.env.APEX_PHASE,
      APEX_INTERACTIVE: process.env.APEX_INTERACTIVE,
    };

    process.env.APEX_HOOK_PROFILE = config.hooks;
    process.env.APEX_PHASE = config.name;

    if (config.name === 'execution') {
      process.env.APEX_DISABLED_HOOKS = 'session-start:brainstorm';
      process.env.APEX_INTERACTIVE = 'false';
    } else if (config.name === 'interactive') {
      process.env.APEX_INTERACTIVE = 'true';
    }
  }

  restoreEnvironment(): void {
    for (const [key, value] of Object.entries(this.envBackup)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  getBlockedSkills(): string[] {
    return PROFILES[this.currentProfile].blockedSkills;
  }

  getAllowedSkills(): string[] {
    return PROFILES[this.currentProfile].skills;
  }

  isInteractiveAllowed(): boolean {
    return PROFILES[this.currentProfile].interactiveAllowed;
  }

  isAutoExecute(): boolean {
    return PROFILES[this.currentProfile].autoExecute;
  }

  getCapabilities(): CapabilityProfile {
    return PROFILES[this.currentProfile].capabilities;
  }
}
