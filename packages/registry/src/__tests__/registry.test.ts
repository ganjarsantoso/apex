import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TypedEventBus } from '@apex/events';
import { AgentRegistry } from '../agent-registry.js';
import { DEFAULT_AGENTS } from '../default-agents.js';
import { AgentStore, AssignmentStore, getMemoryConnection, runMigrations } from '../storage/index.js';
import { AgentSpec, AgentAssignment, AgentCapability, AgentRole } from '../schema.js';

describe('AgentSchema', () => {
  it('creates a valid agent spec from defaults', () => {
    const agent = DEFAULT_AGENTS[0];
    expect(agent.agentId).toBe('agent_orchestrator');
    expect(agent.role).toBe('ORCHESTRATOR');
    expect(agent.capabilities.orchestration).toBe(true);
  });

  it('default agents cover all 6 roles', () => {
    const roles = DEFAULT_AGENTS.map((a) => a.role);
    expect(roles).toContain('ORCHESTRATOR');
    expect(roles).toContain('BRAIN');
    expect(roles).toContain('PLANNER');
    expect(roles).toContain('ENGINE');
    expect(roles).toContain('CODE_REVIEWER');
    expect(roles).toContain('SECURITY_REVIEWER');
  });
});

describe('AgentRegistry', () => {
  it('registers all default agents', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    expect(registry.getStats().total).toBe(6);
  });

  it('finds agents by role', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    const reviewers = registry.findByRole('CODE_REVIEWER');
    expect(reviewers).toHaveLength(1);
    expect(reviewers[0].agentId).toBe('agent_code_reviewer');
  });

  it('finds agents by capability', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    const coders = registry.findByCapability('coding');
    expect(coders.length).toBeGreaterThanOrEqual(2);
    expect(coders.map((a) => a.agentId)).toContain('agent_engine');
  });

  it('finds idle agents', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    const idle = registry.findIdleAgents();
    expect(idle).toHaveLength(6);
  });

  it('updates agent status', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    const ok = registry.updateStatus('agent_engine', 'BUSY');
    expect(ok).toBe(true);
    const agent = registry.getAgent('agent_engine');
    expect(agent!.status).toBe('BUSY');
    const idle = registry.findIdleAgents();
    expect(idle).toHaveLength(5);
  });

  it('updates load factor', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    registry.updateLoadFactor('agent_engine', 0.75);
    expect(registry.getAgent('agent_engine')!.loadFactor).toBe(0.75);
  });

  it('clamps load factor to 0-1 range', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    registry.updateLoadFactor('agent_engine', 1.5);
    expect(registry.getAgent('agent_engine')!.loadFactor).toBe(1);
  });

  it('lists agents with filters', () => {
    const registry = new AgentRegistry();
    registry.registerDefaults();
    const all = registry.list();
    expect(all).toHaveLength(6);
    const idle = registry.list({ status: 'IDLE' });
    expect(idle).toHaveLength(6);
  });

  it('emits AgentRegistered for each default agent', () => {
    const bus = new TypedEventBus();
    const registry = new AgentRegistry(bus);
    const captured: string[] = [];
    bus.on('AgentRegistered', (event) => { captured.push(event.agentId); });
    registry.registerDefaults();
    expect(captured).toHaveLength(6);
    expect(captured[0]).toBe('agent_orchestrator');
  });

  it('emits AgentStatusChanged on status update', () => {
    const bus = new TypedEventBus();
    const registry = new AgentRegistry(bus);
    registry.registerDefaults();
    let captured: unknown = null;
    bus.on('AgentStatusChanged', (event) => { captured = event; });
    registry.updateStatus('agent_engine', 'BUSY');
    expect(captured).not.toBeNull();
    const evt = captured as Record<string, unknown>;
    expect(evt.from).toBe('IDLE');
    expect(evt.to).toBe('BUSY');
  });
});

describe('AgentStore', () => {
  let store: AgentStore;

  beforeAll(() => {
    const db = getMemoryConnection();
    runMigrations(db);
    store = new AgentStore(db);
  });

  it('saves and loads an agent', () => {
    store.save(DEFAULT_AGENTS[0]);
    const loaded = store.load('agent_orchestrator');
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('orchestrator');
    expect(loaded!.role).toBe('ORCHESTRATOR');
    expect(loaded!.capabilities.orchestration).toBe(true);
  });

  it('updates agent status', () => {
    store.updateStatus('agent_orchestrator', 'BUSY');
    expect(store.load('agent_orchestrator')!.status).toBe('BUSY');
  });

  it('deletes an agent', () => {
    store.save({ ...DEFAULT_AGENTS[1], agentId: 'temp_test' });
    store.delete('temp_test');
    expect(store.load('temp_test')).toBeNull();
  });
});

describe('AssignmentStore', () => {
  let aStore: AssignmentStore;

  beforeAll(() => {
    const db = getMemoryConnection();
    runMigrations(db);
    const agentStore = new AgentStore(db);
    agentStore.save(DEFAULT_AGENTS[3]); // agent_engine for FK refs
    aStore = new AssignmentStore(db);
  });

  it('saves and loads an assignment', () => {
    const now = new Date().toISOString();
    const assignment: AgentAssignment = {
      assignmentId: 'assign_001',
      taskId: 'task_1',
      agentId: 'agent_engine',
      manifestId: 'manifest_001',
      status: 'PENDING',
      createdAt: now,
    };
    aStore.save(assignment);
    const loaded = aStore.load('assign_001');
    expect(loaded).not.toBeNull();
    expect(loaded!.agentId).toBe('agent_engine');
    expect(loaded!.status).toBe('PENDING');
  });

  it('updates assignment status', () => {
    aStore.updateStatus('assign_001', 'ACTIVE');
    expect(aStore.load('assign_001')!.status).toBe('ACTIVE');
    expect(aStore.load('assign_001')!.startedAt).toBeDefined();
  });

  it('lists assignments by manifest', () => {
    const now = new Date().toISOString();
    aStore.save({
      assignmentId: 'assign_002',
      taskId: 'task_2',
      agentId: 'agent_engine',
      manifestId: 'manifest_001',
      status: 'PENDING',
      createdAt: now,
    });
    const list = aStore.getByManifest('manifest_001');
    expect(list).toHaveLength(2);
  });

  it('lists active assignments', () => {
    const active = aStore.listActive();
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active.every((a) => a.status === 'PENDING' || a.status === 'ACTIVE')).toBe(true);
  });
});

describe('EventBus Integration', () => {
  it('emits TaskAssigned event', async () => {
    const bus = new TypedEventBus();
    let captured: unknown = null;
    bus.on('TaskAssigned', (event) => { captured = event; });

    await bus.emit('TaskAssigned', {
      version: '1.0',
      eventId: 'evt_ta_001',
      timestamp: new Date().toISOString(),
      source: 'registry',
      correlationId: 'assign_001',
      taskId: 'task_1',
      agentId: 'agent_engine',
      manifestId: 'manifest_001',
      assignmentId: 'assign_001',
    });

    expect(captured).not.toBeNull();
    const evt = captured as Record<string, unknown>;
    expect(evt.taskId).toBe('task_1');
    expect(evt.agentId).toBe('agent_engine');
  });

  it('emits TaskUnassigned event', async () => {
    const bus = new TypedEventBus();
    let captured: unknown = null;
    bus.on('TaskUnassigned', (event) => { captured = event; });

    await bus.emit('TaskUnassigned', {
      version: '1.0',
      eventId: 'evt_tu_001',
      timestamp: new Date().toISOString(),
      source: 'registry',
      correlationId: 'assign_001',
      taskId: 'task_1',
      agentId: 'agent_engine',
      assignmentId: 'assign_001',
    });

    expect(captured).not.toBeNull();
    const evt = captured as Record<string, unknown>;
    expect(evt.agentId).toBe('agent_engine');
    expect(evt.assignmentId).toBe('assign_001');
  });
});
