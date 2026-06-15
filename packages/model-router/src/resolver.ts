import { TypedEventBus } from '@apex/events';
import { AgentRegistry, AgentAssignment } from '@apex/registry';
import { generateId, formatTimestamp } from '@apex/shared';
import { ModelRegistry } from './registry.js';
import { ModelConfigService } from './config.js';
import { ResolutionResult } from './types.js';

export class ModelResolver {
  private modelRegistry: ModelRegistry;
  private configService: ModelConfigService;
  private agentRegistry: AgentRegistry;
  private eventBus: TypedEventBus;

  constructor(
    modelRegistry: ModelRegistry,
    configService: ModelConfigService,
    agentRegistry: AgentRegistry,
    options?: {
      eventBus?: TypedEventBus;
    },
  ) {
    this.modelRegistry = modelRegistry;
    this.configService = configService;
    this.agentRegistry = agentRegistry;
    this.eventBus = options?.eventBus ?? new TypedEventBus();
  }

  resolve(agentId: string, taskId: string): ResolutionResult {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      return this.fallback(agentId, taskId, `Agent not found: ${agentId}`);
    }

    const config = this.configService.getConfig();

    // 1. Check agent-specific override
    const agentOverride = config.agentOverrides[agentId];
    if (agentOverride && this.modelRegistry.validate(agentOverride)) {
      return this.result(agentOverride, agentId, taskId, 'profile', `Agent override: ${agentOverride}`);
    }

    // 2. Check role-based override
    const roleOverride = config.roleOverrides[agent.role];
    if (roleOverride && this.modelRegistry.validate(roleOverride)) {
      return this.result(roleOverride, agentId, taskId, 'role', `Role override (${agent.role}): ${roleOverride}`);
    }

    // 3. Check agent's preferredModel
    if (agent.preferredModel && this.modelRegistry.validate(agent.preferredModel)) {
      return this.result(agent.preferredModel, agentId, taskId, 'profile', `Agent preferred model: ${agent.preferredModel}`);
    }

    // 4. Use default
    const defaultModel = config.defaultModel;
    if (defaultModel && this.modelRegistry.validate(defaultModel)) {
      return this.result(defaultModel, agentId, taskId, 'default', `Default model: ${defaultModel}`);
    }

    // 5. Fallback - first available model
    return this.fallback(agentId, taskId, 'No configured model available');
  }

  resolveForAssignment(assignment: AgentAssignment): ResolutionResult {
    return this.resolve(assignment.agentId, assignment.taskId);
  }

  private result(modelId: string, agentId: string, taskId: string, resolutionSource: ResolutionResult['source'], reason: string): ResolutionResult {
    const result: ResolutionResult = { modelId, agentId, taskId, source: resolutionSource, reason };

    this.eventBus.emit('ModelResolved', {
      version: '1.0',
      eventId: generateId(),
      correlationId: taskId,
      timestamp: formatTimestamp(),
      source: 'model-resolver',
      taskId,
      agentId,
      modelId,
      resolutionSource,
      reason,
    }).catch(() => {});

    return result;
  }

  private fallback(agentId: string, taskId: string, reason: string): ResolutionResult {
    const available = this.modelRegistry.listAvailable();
    if (available.length > 0) {
      return this.result(available[0].modelId, agentId, taskId, 'fallback', reason);
    }
    return {
      modelId: 'unknown',
      agentId,
      taskId,
      source: 'fallback',
      reason: 'No models available',
    };
  }
}
