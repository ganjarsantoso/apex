import { describe, it, expect, beforeEach } from 'vitest';
import { TypedEventBus } from '@apex/events';
import { AgentRegistry, DEFAULT_AGENTS } from '@apex/registry';
import { ModelRegistry } from '../registry.js';
import { FileConfigStore } from '../config-store.js';
import { ModelConfigService } from '../config.js';
import { ModelResolver } from '../resolver.js';
import { CommandParser } from '../command-parser.js';
import { ModelSpec, ModelConfiguration } from '../types.js';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('ModelRegistry', () => {
  it('has built-in big-pickle model', () => {
    const registry = new ModelRegistry();
    const model = registry.get('big-pickle');
    expect(model).toBeDefined();
    expect(model!.modelId).toBe('big-pickle');
    expect(model!.available).toBe(true);
  });

  it('registers custom models', () => {
    const registry = new ModelRegistry();
    registry.register({
      modelId: 'custom-model',
      provider: 'custom',
      displayName: 'Custom',
      available: true,
      maxTokens: 8000,
      capabilities: ['coding'],
    });
    expect(registry.get('custom-model')).toBeDefined();
    expect(registry.list()).toHaveLength(2);
  });

  it('listAvailable filters unavailable models', () => {
    const registry = new ModelRegistry();
    registry.register({
      modelId: 'unavailable-model',
      provider: 'test',
      displayName: 'Unavailable',
      available: false,
      maxTokens: 0,
      capabilities: [],
    });
    expect(registry.listAvailable()).toHaveLength(1);
  });

  it('validate returns true only for available models', () => {
    const registry = new ModelRegistry();
    expect(registry.validate('big-pickle')).toBe(true);
    expect(registry.validate('nonexistent')).toBe(false);
    registry.register({
      modelId: 'offline', provider: 'test', displayName: 'Offline',
      available: false, maxTokens: 0, capabilities: [],
    });
    expect(registry.validate('offline')).toBe(false);
  });
});

describe('FileConfigStore', () => {
  const testPath = resolve(process.cwd(), 'apex.test.config.json');

  beforeEach(() => {
    if (existsSync(testPath)) unlinkSync(testPath);
  });

  it('returns defaults when no file exists', () => {
    const store = new FileConfigStore(testPath);
    const config = store.load();
    expect(config.defaultModel).toBe('big-pickle');
    expect(config.roleOverrides).toEqual({});
  });

  it('persists and reloads config', () => {
    const store = new FileConfigStore(testPath);
    const config: ModelConfiguration = {
      defaultModel: 'big-pickle',
      roleOverrides: { ENGINE: 'big-pickle' },
      agentOverrides: {},
    };
    store.save(config);

    const store2 = new FileConfigStore(testPath);
    const reloaded = store2.load();
    expect(reloaded.defaultModel).toBe('big-pickle');
    expect(reloaded.roleOverrides.ENGINE).toBe('big-pickle');
  });

  it('reset clears config to defaults', () => {
    const store = new FileConfigStore(testPath);
    store.save({ defaultModel: 'foo', roleOverrides: { ENGINE: 'bar' }, agentOverrides: {} });
    store.reset();
    const config = store.load();
    expect(config.defaultModel).toBe('big-pickle');
    expect(config.roleOverrides).toEqual({});
  });

  it('reset with keepDefault preserves defaultModel', () => {
    const store = new FileConfigStore(testPath);
    store.save({ defaultModel: 'foo', roleOverrides: { ENGINE: 'bar' }, agentOverrides: {} });
    store.reset({ keepDefault: true });
    const config = store.load();
    expect(config.defaultModel).toBe('foo');
    expect(config.roleOverrides).toEqual({});
  });
});

describe('ModelConfigService', () => {
  let registry: ModelRegistry;
  let store: FileConfigStore;
  let service: ModelConfigService;
  const testPath = resolve(process.cwd(), 'apex.test.config.json');

  beforeEach(() => {
    if (existsSync(testPath)) unlinkSync(testPath);
    registry = new ModelRegistry();
    store = new FileConfigStore(testPath);
    service = new ModelConfigService(registry, { configStore: store });
  });

  it('setDefaultModel validates and persists', () => {
    expect(service.setDefaultModel('nonexistent')).toBe(false);
    expect(service.setDefaultModel('big-pickle')).toBe(true);
    expect(service.getConfig().defaultModel).toBe('big-pickle');
  });

  it('setRoleOverride validates and persists', () => {
    expect(service.setRoleOverride('ENGINE', 'nonexistent')).toBe(false);
    expect(service.setRoleOverride('ENGINE', 'big-pickle')).toBe(true);
    expect(service.getConfig().roleOverrides.ENGINE).toBe('big-pickle');
  });

  it('setAgentOverride validates and persists', () => {
    expect(service.setAgentOverride('agent_engine', 'nonexistent')).toBe(false);
    expect(service.setAgentOverride('agent_engine', 'big-pickle')).toBe(true);
    expect(service.getConfig().agentOverrides.agent_engine).toBe('big-pickle');
  });

  it('removeRoleOverride removes the override', () => {
    service.setRoleOverride('ENGINE', 'big-pickle');
    expect(service.getConfig().roleOverrides.ENGINE).toBe('big-pickle');
    service.removeRoleOverride('ENGINE');
    expect(service.getConfig().roleOverrides.ENGINE).toBeUndefined();
  });

  it('removeAgentOverride removes the override', () => {
    service.setAgentOverride('agent_engine', 'big-pickle');
    expect(service.getConfig().agentOverrides.agent_engine).toBe('big-pickle');
    service.removeAgentOverride('agent_engine');
    expect(service.getConfig().agentOverrides.agent_engine).toBeUndefined();
  });

  it('reset clears to defaults', () => {
    service.setDefaultModel('big-pickle');
    service.setRoleOverride('ENGINE', 'big-pickle');
    service.reset();
    expect(service.getConfig().roleOverrides).toEqual({});
  });

  it('emits ModelConfigurationUpdated on change', () => {
    const events: string[] = [];
    service = new ModelConfigService(registry, {
      configStore: store,
      eventBus: new (class extends TypedEventBus {
        emit(event: string): Promise<void> {
          events.push(event);
          return Promise.resolve();
        }
      })(),
    });
    service.setDefaultModel('big-pickle');
    expect(events).toContain('ModelConfigurationUpdated');
  });
});

describe('ModelResolver', () => {
  let registry: AgentRegistry;
  let modelRegistry: ModelRegistry;
  let store: FileConfigStore;
  let configService: ModelConfigService;
  let resolver: ModelResolver;
  const testPath = resolve(process.cwd(), 'apex.test.config.json');

  beforeEach(() => {
    if (existsSync(testPath)) unlinkSync(testPath);
    registry = new AgentRegistry();
    for (const agent of DEFAULT_AGENTS) registry.register(agent);
    modelRegistry = new ModelRegistry();
    store = new FileConfigStore(testPath);
    configService = new ModelConfigService(modelRegistry, { configStore: store });
    resolver = new ModelResolver(modelRegistry, configService, registry);
  });

  it('resolves using agentOverride first', () => {
    configService.setAgentOverride('agent_engine', 'big-pickle');
    const result = resolver.resolve('agent_engine', 'task_1');
    expect(result.modelId).toBe('big-pickle');
    expect(result.source).toBe('profile');
    expect(result.reason).toContain('Agent override');
  });

  it('resolves using roleOverride second', () => {
    configService.setRoleOverride('ENGINE', 'big-pickle');
    const result = resolver.resolve('agent_engine', 'task_1');
    expect(result.modelId).toBe('big-pickle');
    expect(result.source).toBe('role');
    expect(result.reason).toContain('Role override');
  });

  it('resolves using preferredModel third', () => {
    registry.register({
      agentId: 'agent_preferred',
      name: 'PreferredAgent',
      role: 'CUSTOM',
      status: 'IDLE',
      capabilities: { planning: true, coding: true, testing: true, reviewing: false, security: false, orchestration: false },
      preferredProfile: 'execution',
      preferredModel: 'big-pickle',
      loadFactor: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const result = resolver.resolve('agent_preferred', 'task_2');
    expect(result.modelId).toBe('big-pickle');
    expect(result.source).toBe('profile');
    expect(result.reason).toContain('Agent preferred model');
  });

  it('resolves using defaultModel fourth', () => {
    const agents = registry.list();
    const customAgent = agents.find((a) => a.role === 'CODE_REVIEWER')!;
    const result = resolver.resolve(customAgent.agentId, 'task_1');
    expect(result.modelId).toBe('big-pickle');
    expect(result.source).toBe('default');
  });

  it('falls back to first available when default is invalid', () => {
    registry.register({
      agentId: 'agent_no_model',
      name: 'NoModel',
      role: 'ENGINE',
      status: 'IDLE',
      capabilities: { planning: true, coding: true, testing: true, reviewing: false, security: false, orchestration: false },
      preferredProfile: 'execution',
      preferredModel: undefined,
      loadFactor: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    store.save({ defaultModel: 'nonexistent', roleOverrides: {}, agentOverrides: {} });
    const result = resolver.resolve('agent_no_model', 'task_1');
    expect(result.modelId).toBe('big-pickle');
    expect(result.source).toBe('fallback');
  });

  it('returns unknown when no models available', () => {
    const emptyRegistry = new ModelRegistry([]);
    const emptyResolver = new ModelResolver(emptyRegistry, configService, registry);
    store.save({ defaultModel: 'nonexistent', roleOverrides: {}, agentOverrides: {} });
    const result = emptyResolver.resolve('agent_engine', 'task_1');
    expect(result.modelId).toBe('unknown');
    expect(result.source).toBe('fallback');
  });

  it('handles unknown agent gracefully', () => {
    const result = resolver.resolve('nonexistent_agent', 'task_1');
    expect(result.modelId).toBe('big-pickle');
    expect(result.source).toBe('fallback');
  });

  it('resolveForAssignment works with assignment object', () => {
    const assignment = {
      assignmentId: 'a1',
      taskId: 'task_1',
      agentId: 'agent_engine',
      manifestId: 'm1',
      status: 'ASSIGNED' as const,
      createdAt: new Date().toISOString(),
    };
    const result = resolver.resolveForAssignment(assignment);
    expect(result.modelId).toBe('big-pickle');
    expect(result.agentId).toBe('agent_engine');
  });

  it('emits ModelResolved event', () => {
    const events: string[] = [];
    resolver = new ModelResolver(modelRegistry, configService, registry, {
      eventBus: new (class extends TypedEventBus {
        emit(event: string): Promise<void> {
          events.push(event);
          return Promise.resolve();
        }
      })(),
    });
    resolver.resolve('agent_engine', 'task_1');
    expect(events).toContain('ModelResolved');
  });
});

describe('CommandParser', () => {
  let registry: ModelRegistry;
  let store: FileConfigStore;
  let configService: ModelConfigService;
  let parser: CommandParser;
  const testPath = resolve(process.cwd(), 'apex.test.config.json');

  beforeEach(() => {
    if (existsSync(testPath)) unlinkSync(testPath);
    registry = new ModelRegistry();
    store = new FileConfigStore(testPath);
    configService = new ModelConfigService(registry, { configStore: store });
    parser = new CommandParser(configService);
  });

  it('parses "use X for everything"', () => {
    const cmd = parser.parse('use big-pickle for everything');
    expect(cmd.type).toBe('set-default');
    expect(cmd.params.modelId).toBe('big-pickle');
  });

  it('parses "use X for Y" as role', () => {
    const cmd = parser.parse('use big-pickle for engineer');
    expect(cmd.type).toBe('set-role');
    expect(cmd.params.role).toBe('ENGINE');
  });

  it('parses "use X for agent Y"', () => {
    const cmd = parser.parse('use big-pickle for agent agent_engine');
    expect(cmd.type).toBe('set-agent');
    expect(cmd.params.agentId).toBe('agent_engine');
  });

  it('parses "show model config"', () => {
    const cmd = parser.parse('show model config');
    expect(cmd.type).toBe('show');
  });

  it('parses "get model config"', () => {
    const cmd = parser.parse('get model config');
    expect(cmd.type).toBe('show');
  });

  it('parses "reset model config"', () => {
    const cmd = parser.parse('reset model config');
    expect(cmd.type).toBe('reset');
  });

  it('parses "remove X override"', () => {
    const cmd = parser.parse('remove engineer override');
    expect(cmd.type).toBe('remove-role');
    expect(cmd.params.role).toBe('ENGINE');
  });

  it('returns unknown for unrecognized commands', () => {
    const cmd = parser.parse('do something weird');
    expect(cmd.type).toBe('unknown');
  });

  it('executes set-default', () => {
    const msg = parser.execute('use big-pickle for everything');
    expect(msg).toContain('Default model set to big-pickle');
  });

  it('executes set-role', () => {
    const msg = parser.execute('use big-pickle for engineer');
    expect(msg).toContain('ENGINE role now uses big-pickle');
  });

  it('executes set-agent', () => {
    const msg = parser.execute('use big-pickle for agent agent_001');
    expect(msg).toContain('Agent agent_001 now uses big-pickle');
  });

  it('executes show', () => {
    const msg = parser.execute('show model config');
    expect(msg).toContain('Default model:');
    expect(msg).toContain('big-pickle');
  });

  it('executes reset', () => {
    configService.setRoleOverride('ENGINE', 'big-pickle');
    const msg = parser.execute('reset model config');
    expect(msg).toContain('reset');
    expect(configService.getConfig().roleOverrides).toEqual({});
  });

  it('handles unknown model gracefully', () => {
    const msg = parser.execute('use nonexistent for everything');
    expect(msg).toContain('not found');
  });

  it('normalizes role names', () => {
    const cmd = parser.parse('use big-pickle for code reviewer');
    expect(cmd.type).toBe('set-role');
    expect(cmd.params.role).toBe('CODE_REVIEWER');

    const cmd2 = parser.parse('use big-pickle for code-reviewer');
    expect(cmd2.params.role).toBe('CODE_REVIEWER');
  });
});
