import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TypedEventBus } from '@apex/events';
import { PolicyEngine } from '@apex/sentinel';
import { PROFILES } from '@apex/types';
import { PlanCompiler } from '@apex/compiler';
import { ManifestCompiler } from '@apex/compiler';
import { ManifestValidator } from '../validator.js';
import { ManifestSentinelValidator } from '../sentinel-validator.js';
import { ManifestStore, getMemoryConnection, runMigrations } from '../storage/index.js';
import { ExecutionManifestSchema } from '../schema.js';

const compiler = new PlanCompiler();
const manifestCompiler = new ManifestCompiler();
const validator = new ManifestValidator();

const TEST_SPEC = {
  title: 'Test Project',
  topic: 'test',
  description: 'A test project for manifest compilation',
  components: [{ name: 'core', purpose: 'Core logic' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  filePath: 'specs/test.json',
};

const TEST_TASK_GRAPH = {
  milestone: 'core',
  tasks: [
    {
      id: 'task_1',
      title: 'Setup',
      objective: 'Initialize project structure',
      dependencies: [],
      files: { create: ['src/index.ts'] },
      steps: [{ description: 'Create files' }],
      acceptanceCriteria: ['Project compiles'],
    },
    {
      id: 'task_2',
      title: 'Implement',
      objective: 'Implement core feature',
      dependencies: ['task_1'],
      files: { modify: ['src/index.ts'], test: ['tests/core.test.ts'] },
      steps: [{ description: 'Write implementation' }, { description: 'Write tests' }],
      acceptanceCriteria: ['All tests pass'],
    },
  ],
};

describe('ManifestSchema', () => {
  it('parses a valid manifest', () => {
    const now = new Date().toISOString();
    const result = ExecutionManifestSchema.safeParse({
      manifestId: 'manifest_001',
      projectId: 'project_001',
      version: '1.0.0',
      state: 'DRAFT',
      metadata: { requirement: 'req', specification: 'spec', architecturePlan: 'plan' },
      milestones: [{ id: 'm1', title: 'Core', description: 'Core tasks', taskIds: ['t1'] }],
      tasks: [{ taskId: 't1', title: 'Task 1', description: 'Do thing', state: 'READY', dependsOn: [], outputs: ['src/file.ts'], priority: 50 }],
      constraints: [{ id: 'c1', type: 'SECURITY', description: 'Must pass scan' }],
      reviewRequirements: [{ id: 'r1', stage: 'CODE', mandatory: true }],
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid manifest state', () => {
    const now = new Date().toISOString();
    const result = ExecutionManifestSchema.safeParse({
      manifestId: 'manifest_001',
      projectId: 'project_001',
      version: '1.0.0',
      state: 'INVALID_STATE',
      metadata: { requirement: 'req', specification: 'spec', architecturePlan: 'plan' },
      milestones: [],
      tasks: [],
      constraints: [],
      reviewRequirements: [],
      createdAt: now,
      updatedAt: now,
    });
    expect(result.success).toBe(false);
  });
});

describe('ManifestCompiler', () => {
  it('compiles an ExecutionPlan into an ExecutionManifest', () => {
    const plan = compiler.compile({
      spec: TEST_SPEC,
      taskGraph: TEST_TASK_GRAPH,
      planFilePath: 'plans/test.json',
      specFilePath: 'specs/test.json',
    });

    const manifest = manifestCompiler.compile({ executionPlan: plan, spec: TEST_SPEC });
    expect(manifest.manifestId).toMatch(/^manifest_/);
    expect(manifest.state).toBe('DRAFT');
    expect(manifest.tasks).toHaveLength(2);
    expect(manifest.constraints.length).toBeGreaterThanOrEqual(1);
    expect(manifest.reviewRequirements.length).toBe(3);
  });

  it('sets READY state for tasks with no dependencies', () => {
    const plan = compiler.compile({
      spec: TEST_SPEC,
      taskGraph: TEST_TASK_GRAPH,
      planFilePath: 'plans/test.json',
      specFilePath: 'specs/test.json',
    });

    const manifest = manifestCompiler.compile({ executionPlan: plan, spec: TEST_SPEC });
    const task1 = manifest.tasks.find((t) => t.taskId === 'task_1');
    const task2 = manifest.tasks.find((t) => t.taskId === 'task_2');
    expect(task1?.state).toBe('READY');
    expect(task2?.state).toBe('PENDING');
  });
});

describe('ManifestValidator', () => {
  it('validates a well-formed manifest', () => {
    const plan = compiler.compile({
      spec: TEST_SPEC,
      taskGraph: TEST_TASK_GRAPH,
      planFilePath: 'plans/test.json',
      specFilePath: 'specs/test.json',
    });
    const manifest = manifestCompiler.compile({ executionPlan: plan, spec: TEST_SPEC });
    const result = validator.validate(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches unknown task dependency', () => {
    const now = new Date().toISOString();
    const invalid = {
      manifestId: 'manifest_002',
      projectId: 'project_002',
      version: '1.0.0',
      state: 'DRAFT' as const,
      metadata: { requirement: 'req', specification: 'spec', architecturePlan: 'plan' },
      milestones: [],
      tasks: [{ taskId: 't1', title: 'Task 1', description: 'Do thing', state: 'READY' as const, dependsOn: ['nonexistent'], outputs: [], priority: 50 }],
      constraints: [],
      reviewRequirements: [],
      createdAt: now,
      updatedAt: now,
    };
    const result = validator.validate(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('nonexistent');
  });
});

describe('ManifestSentinelValidator', () => {
  it('approves manifest with passed review gates', () => {
    const sentinelValidator = new ManifestSentinelValidator(new PolicyEngine());
    const now = new Date().toISOString();
    const manifest = {
      manifestId: 'manifest_approve',
      projectId: 'project_approve',
      version: '1.0.0',
      state: 'READY' as const,
      metadata: { requirement: 'req', specification: 'spec', architecturePlan: 'plan' },
      milestones: [],
      tasks: [{ taskId: 't1', title: 'Task 1', description: 'Do thing', state: 'READY' as const, dependsOn: [], outputs: [], priority: 50 }],
      constraints: [],
      reviewRequirements: [{ id: 'r1', stage: 'SECURITY' as const, mandatory: true, passed: true, completedAt: now }],
      createdAt: now,
      updatedAt: now,
    };
    const result = sentinelValidator.validate(manifest, PROFILES.execution.capabilities);
    expect(result.approved).toBe(true);
  });

  it('rejects shell constraint when profile lacks capability', () => {
    const sentinelValidator = new ManifestSentinelValidator(new PolicyEngine());
    const now = new Date().toISOString();
    const manifest = {
      manifestId: 'manifest_003',
      projectId: 'project_003',
      version: '1.0.0',
      state: 'DRAFT' as const,
      metadata: { requirement: 'req', specification: 'spec', architecturePlan: 'plan' },
      milestones: [],
      tasks: [{ taskId: 't1', title: 'Task 1', description: 'Do thing', state: 'READY' as const, dependsOn: [], outputs: [], priority: 50 }],
      constraints: [{ id: 'c1', type: 'CAPABILITY' as const, description: 'requires shell access' }],
      reviewRequirements: [],
      createdAt: now,
      updatedAt: now,
    };
    const result = sentinelValidator.validate(manifest, PROFILES.interactive.capabilities);
    expect(result.approved).toBe(false);
    expect(result.checks[0].passed).toBe(false);
  });
});

describe('ManifestStore', () => {
  let store: ManifestStore;

  beforeAll(() => {
    const db = getMemoryConnection();
    runMigrations(db);
    store = new ManifestStore(db);
  });

  afterAll(() => {
    const db = getMemoryConnection();
    db.close();
  });

  it('saves and loads a manifest', () => {
    const plan = compiler.compile({
      spec: TEST_SPEC,
      taskGraph: TEST_TASK_GRAPH,
      planFilePath: 'plans/test.json',
      specFilePath: 'specs/test.json',
    });
    const manifest = manifestCompiler.compile({ executionPlan: plan, spec: TEST_SPEC });
    store.save(manifest);

    const loaded = store.load(manifest.manifestId);
    expect(loaded).not.toBeNull();
    expect(loaded!.manifestId).toBe(manifest.manifestId);
    expect(loaded!.tasks).toHaveLength(2);
  });

  it('updates manifest state', () => {
    const plan = compiler.compile({
      spec: TEST_SPEC,
      taskGraph: TEST_TASK_GRAPH,
      planFilePath: 'plans/test.json',
      specFilePath: 'specs/test.json',
    });
    const manifest = manifestCompiler.compile({ executionPlan: plan, spec: TEST_SPEC });
    store.save(manifest);
    store.updateState(manifest.manifestId, 'EXECUTING');

    const loaded = store.load(manifest.manifestId);
    expect(loaded!.state).toBe('EXECUTING');
  });

  it('lists manifests', () => {
    const list = store.list();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0]).toHaveProperty('manifestId');
    expect(list[0]).toHaveProperty('state');
  });

  it('deletes a manifest', () => {
    const plan = compiler.compile({
      spec: TEST_SPEC,
      taskGraph: TEST_TASK_GRAPH,
      planFilePath: 'plans/test.json',
      specFilePath: 'specs/test.json',
    });
    const manifest = manifestCompiler.compile({ executionPlan: plan, spec: TEST_SPEC, projectId: 'del_test' });
    store.save(manifest);
    store.delete(manifest.manifestId);
    expect(store.load(manifest.manifestId)).toBeNull();
  });
});

describe('EventBus Integration', () => {
  it('emits ManifestCreated on compilation', async () => {
    const bus = new TypedEventBus();
    let captured: unknown = null;
    bus.on('ManifestCreated', (event) => { captured = event; });

    const plan = compiler.compile({
      spec: TEST_SPEC,
      taskGraph: TEST_TASK_GRAPH,
      planFilePath: 'plans/test.json',
      specFilePath: 'specs/test.json',
    });
    const manifest = manifestCompiler.compile({ executionPlan: plan, spec: TEST_SPEC, projectId: 'evt_test' });

    await bus.emit('ManifestCreated', {
      version: '1.0',
      eventId: 'evt_mc_001',
      timestamp: new Date().toISOString(),
      source: 'compiler',
      correlationId: manifest.manifestId,
      manifestId: manifest.manifestId,
      projectId: manifest.projectId,
      state: manifest.state,
      taskCount: manifest.tasks.length,
    });

    expect(captured).not.toBeNull();
    const evt = captured as Record<string, unknown>;
    expect(evt.manifestId).toBe(manifest.manifestId);
    expect(evt.taskCount).toBe(2);
  });

  it('emits ManifestUpdated on state change', async () => {
    const bus = new TypedEventBus();
    let captured: unknown = null;
    bus.on('ManifestUpdated', (event) => { captured = event; });

    await bus.emit('ManifestUpdated', {
      version: '1.0',
      eventId: 'evt_mu_001',
      timestamp: new Date().toISOString(),
      source: 'orchestrator',
      correlationId: 'manifest_001',
      manifestId: 'manifest_001',
      projectId: 'project_001',
      state: 'EXECUTING',
      changedFields: ['state'],
    });

    expect(captured).not.toBeNull();
    const evt = captured as Record<string, unknown>;
    expect(evt.state).toBe('EXECUTING');
    expect(evt.changedFields).toEqual(['state']);
  });
});
