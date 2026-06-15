import { CapabilityProfile } from '@apex/types';

export interface SecurityPolicy {
  filesystem: {
    allow: string[];
    deny: string[];
  };
  network: {
    allow: string[];
    deny: string[];
  };
  commands: {
    allow: string[];
    deny: string[];
  };
}

const DEFAULT_POLICY: SecurityPolicy = {
  filesystem: {
    allow: ['project/*'],
    deny: ['system/*', '/etc/*', '/usr/*', '/var/*'],
  },
  network: {
    allow: ['api.github.com', 'registry.npmjs.org', 'opencode.ai'],
    deny: ['*'],
  },
  commands: {
    allow: ['git', 'npm', 'pnpm', 'yarn', 'node', 'tsc', 'vitest', 'eslint'],
    deny: ['sudo', 'su', 'chmod', 'dd', 'mkfs', 'fdisk'],
  },
};

const CAPABILITY_MAP: Record<string, keyof CapabilityProfile> = {
  read: 'filesystem',
  write: 'filesystem',
  shell: 'shell',
  network: 'network',
};

export type CheckResult = { allowed: boolean; reason?: string };

export class PolicyEngine {
  private policy: SecurityPolicy;

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = this.mergePolicy(DEFAULT_POLICY, policy ?? {});
  }

  checkCapability(operation: string, profile: CapabilityProfile): CheckResult {
    switch (operation) {
      case 'read':
        return profile.filesystem.read
          ? { allowed: true }
          : { allowed: false, reason: 'Profile lacks filesystem read capability' };
      case 'write':
        return profile.filesystem.write
          ? { allowed: true }
          : { allowed: false, reason: 'Profile lacks filesystem write capability' };
      case 'shell':
        return profile.shell.execute
          ? { allowed: true }
          : { allowed: false, reason: 'Profile lacks shell execute capability' };
      case 'network':
        return profile.network.outbound
          ? { allowed: true }
          : { allowed: false, reason: 'Profile lacks network outbound capability' };
      default:
        return { allowed: false, reason: `Unknown operation: ${operation}` };
    }
  }

  checkFileAccess(filePath: string, profile?: CapabilityProfile): CheckResult {
    if (profile) {
      const capResult = this.checkCapability('read', profile);
      if (!capResult.allowed) return capResult;
    }

    for (const deny of this.policy.filesystem.deny) {
      const pattern = new RegExp(`^${deny.replace('*', '.*')}`);
      if (pattern.test(filePath)) {
        return { allowed: false, reason: `Path denied by policy: ${deny}` };
      }
    }

    for (const allow of this.policy.filesystem.allow) {
      const pattern = new RegExp(`^${allow.replace('*', '.*')}`);
      if (pattern.test(filePath)) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'Path not in allow list' };
  }

  checkCommand(command: string, profile?: CapabilityProfile): CheckResult {
    if (profile) {
      const capResult = this.checkCapability('shell', profile);
      if (!capResult.allowed) return capResult;
    }

    const cmdName = command.split(/\s+/)[0];

    for (const deny of this.policy.commands.deny) {
      if (cmdName === deny) {
        return { allowed: false, reason: `Command denied by policy: ${deny}` };
      }
    }

    for (const allow of this.policy.commands.allow) {
      if (cmdName === allow) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: `Command not in allow list: ${cmdName}` };
  }

  private mergePolicy(defaults: SecurityPolicy, override: Partial<SecurityPolicy>): SecurityPolicy {
    return {
      filesystem: { ...defaults.filesystem, ...override.filesystem },
      network: { ...defaults.network, ...override.network },
      commands: { ...defaults.commands, ...override.commands },
    };
  }
}
