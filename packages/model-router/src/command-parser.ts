import { ModelConfigService } from './config.js';

interface ParsedCommand {
  type: 'set-default' | 'set-role' | 'set-agent' | 'remove-role' | 'remove-agent' | 'reset' | 'show' | 'unknown';
  params: Record<string, string>;
  raw: string;
}

export class CommandParser {
  private configService: ModelConfigService;

  constructor(configService: ModelConfigService) {
    this.configService = configService;
  }

  parse(input: string): ParsedCommand {
    const trimmed = input.trim().toLowerCase();

    // "use <model> for everything"
    const forEverything = trimmed.match(/^use\s+(\S+)\s+for\s+everything$/);
    if (forEverything) {
      return {
        type: 'set-default',
        params: { modelId: forEverything[1] },
        raw: input,
      };
    }

    // MUST check agent BEFORE role (agent regex is more specific)
    // "use <model> for agent <agentId>"
    const forAgent = trimmed.match(/^use\s+(\S+)\s+for\s+agent\s+(\S+)$/);
    if (forAgent) {
      return {
        type: 'set-agent',
        params: { modelId: forAgent[1], agentId: forAgent[2] },
        raw: input,
      };
    }

    // "use <model> for <role>"
    const forRole = trimmed.match(/^use\s+(\S+)\s+for\s+(.+)$/);
    if (forRole) {
      const roleName = this.normalizeRole(forRole[2]);
      return {
        type: 'set-role',
        params: { modelId: forRole[1], role: roleName },
        raw: input,
      };
    }

    // "reset model config"
    if (trimmed.match(/^reset\s+model/)) {
      return { type: 'reset', params: {}, raw: input };
    }

    // "reset model config --keep-default"
    if (trimmed.match(/^reset\s+model\s+--keep-default/)) {
      return { type: 'reset', params: { keepDefault: 'true' }, raw: input };
    }

    // "show model config"
    if (trimmed.match(/^(show|get|list)\s+model/)) {
      return { type: 'show', params: {}, raw: input };
    }

    // "remove <role> override"
    const removeRole = trimmed.match(/^remove\s+(.+)\s+override$/);
    if (removeRole) {
      const roleName = this.normalizeRole(removeRole[1]);
      return {
        type: 'remove-role',
        params: { role: roleName },
        raw: input,
      };
    }

    return { type: 'unknown', params: {}, raw: input };
  }

  execute(input: string): string {
    const command = this.parse(input);

    switch (command.type) {
      case 'set-default': {
        const ok = this.configService.setDefaultModel(command.params.modelId);
        return ok
          ? `Default model set to ${command.params.modelId}`
          : `Model "${command.params.modelId}" not found or unavailable`;
      }

      case 'set-role': {
        const ok = this.configService.setRoleOverride(command.params.role, command.params.modelId);
        return ok
          ? `${command.params.role} role now uses ${command.params.modelId}`
          : `Model "${command.params.modelId}" not found or unavailable`;
      }

      case 'set-agent': {
        const ok = this.configService.setAgentOverride(command.params.agentId, command.params.modelId);
        return ok
          ? `Agent ${command.params.agentId} now uses ${command.params.modelId}`
          : `Model "${command.params.modelId}" not found or unavailable`;
      }

      case 'remove-role': {
        this.configService.removeRoleOverride(command.params.role);
        return `${command.params.role} override removed`;
      }

      case 'reset': {
        this.configService.reset({ keepDefault: command.params.keepDefault === 'true' });
        return 'Model config reset to defaults';
      }

      case 'show': {
        const config = this.configService.getConfig();
        const lines = [
          `Default model: ${config.defaultModel}`,
          `Role overrides: ${Object.keys(config.roleOverrides).length > 0 ? JSON.stringify(config.roleOverrides, null, 2) : '(none)'}`,
          `Agent overrides: ${Object.keys(config.agentOverrides).length > 0 ? JSON.stringify(config.agentOverrides, null, 2) : '(none)'}`,
        ];
        return lines.join('\n');
      }

      default:
        return `Unknown command. Try: "use big-pickle for everything", "use big-pickle for engineer", "show model config", "reset model config"`;
    }
  }

  private normalizeRole(input: string): string {
    const roleMap: Record<string, string> = {
      orchestrator: 'ORCHESTRATOR',
      brain: 'BRAIN',
      planner: 'PLANNER',
      engineer: 'ENGINE',
      'code reviewer': 'CODE_REVIEWER',
      'security reviewer': 'SECURITY_REVIEWER',
      'code-reviewer': 'CODE_REVIEWER',
      'security-reviewer': 'SECURITY_REVIEWER',
    };
    return roleMap[input] ?? input.toUpperCase().replace(/\s+/g, '_');
  }
}
