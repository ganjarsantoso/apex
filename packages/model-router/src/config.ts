import { TypedEventBus } from '@apex/events';
import { generateId, formatTimestamp } from '@apex/shared';
import { ModelRegistry } from './registry.js';
import { FileConfigStore } from './config-store.js';
import { ModelConfiguration, ConfigStore, ResetOptions } from './types.js';

export class ModelConfigService {
  private configStore: ConfigStore;
  private registry: ModelRegistry;
  private eventBus: TypedEventBus;

  constructor(
    registry: ModelRegistry,
    options?: {
      configStore?: ConfigStore;
      eventBus?: TypedEventBus;
    },
  ) {
    this.registry = registry;
    this.configStore = options?.configStore ?? new FileConfigStore();
    this.eventBus = options?.eventBus ?? new TypedEventBus();
  }

  getConfig(): ModelConfiguration {
    return this.configStore.load();
  }

  setDefaultModel(modelId: string): boolean {
    if (!this.registry.validate(modelId)) return false;
    const old = this.configStore.load().defaultModel;
    const config = this.configStore.load();
    config.defaultModel = modelId;
    this.configStore.save(config);
    this.emitConfigChange('defaultModel', old, modelId);
    return true;
  }

  setRoleOverride(role: string, modelId: string): boolean {
    if (!this.registry.validate(modelId)) return false;
    const config = this.configStore.load();
    const old = config.roleOverrides[role];
    config.roleOverrides[role] = modelId;
    this.configStore.save(config);
    this.emitConfigChange(`roleOverride:${role}`, old ?? '', modelId);
    return true;
  }

  setAgentOverride(agentId: string, modelId: string): boolean {
    if (!this.registry.validate(modelId)) return false;
    const config = this.configStore.load();
    const old = config.agentOverrides[agentId];
    config.agentOverrides[agentId] = modelId;
    this.configStore.save(config);
    this.emitConfigChange(`agentOverride:${agentId}`, old ?? '', modelId);
    return true;
  }

  removeRoleOverride(role: string): void {
    const config = this.configStore.load();
    const old = config.roleOverrides[role];
    if (old) {
      delete config.roleOverrides[role];
      this.configStore.save(config);
      this.emitConfigChange(`roleOverride:${role}`, old, '');
    }
  }

  removeAgentOverride(agentId: string): void {
    const config = this.configStore.load();
    const old = config.agentOverrides[agentId];
    if (old) {
      delete config.agentOverrides[agentId];
      this.configStore.save(config);
      this.emitConfigChange(`agentOverride:${agentId}`, old, '');
    }
  }

  reset(options?: ResetOptions): ModelConfiguration {
    const config = this.configStore.reset(options);
    this.emitConfigChange('reset', '', '');
    return config;
  }

  private emitConfigChange(field: string, oldValue: string, newValue: string): void {
    this.eventBus.emit('ModelConfigurationUpdated', {
      version: '1.0',
      eventId: generateId(),
      correlationId: 'config',
      timestamp: formatTimestamp(),
      source: 'model-config',
      changedBy: 'user',
      changes: [{ field, oldValue, newValue }],
    }).catch(() => {});
  }
}
