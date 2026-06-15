import { ManifestTask } from '@apex/manifest';
import { AgentSpec } from '@apex/registry';

const CAPABILITY_KEYWORDS: Array<[RegExp, string]> = [
  [/review/i, 'reviewing'],
  [/security/i, 'security'],
  [/plan/i, 'planning'],
  [/test/i, 'testing'],
  [/code|implement|build|refactor/i, 'coding'],
];

export class TaskRouter {
  route(task: ManifestTask, agents: AgentSpec[]): AgentSpec | null {
    const idle = agents.filter((a) => a.status === 'IDLE' && a.enabled);
    if (idle.length === 0) return null;

    const candidates = this.findCandidates(task, idle);
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.loadFactor !== b.loadFactor) return a.loadFactor - b.loadFactor;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return candidates[0];
  }

  private findCandidates(task: ManifestTask, idle: AgentSpec[]): AgentSpec[] {
    if (task.preferredRole) {
      const byRole = idle.filter((a) => a.role === task.preferredRole);
      if (byRole.length > 0) return byRole;
    }

    if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
      const needs = task.requiredCapabilities;
      const byCap = idle.filter((a) =>
        needs.every((cap) => (a.capabilities as Record<string, boolean>)[cap] === true)
      );
      if (byCap.length > 0) return byCap;
    }

    const keyword = this.matchByKeywords(task);
    if (keyword) {
      const byKeyword = idle.filter((a) => a.capabilities[keyword] === true);
      if (byKeyword.length > 0) return byKeyword;
    }

    const engine = idle.filter((a) => a.role === 'ENGINE');
    if (engine.length > 0) return engine;

    return idle;
  }

  private matchByKeywords(task: ManifestTask): keyof AgentSpec['capabilities'] | null {
    const text = `${task.title} ${task.description}`;
    for (const [pattern, cap] of CAPABILITY_KEYWORDS) {
      if (pattern.test(text)) return cap as keyof AgentSpec['capabilities'];
    }
    return null;
  }
}
