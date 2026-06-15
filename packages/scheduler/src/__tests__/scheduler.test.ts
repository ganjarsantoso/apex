import { describe, it, expect, beforeAll } from 'vitest';
import { TypedEventBus } from '@apex/events';
import { ManifestState, ManifestTaskState } from '@apex/types';
import {
  ManifestStore, ExecutionManifest,
  getMemoryConnection as getManifestMemory, runMigrations as runManifestMigrations,
} from '@apex/manifest';
import {
  AgentRegistry, AgentStore, AssignmentStore, DEFAULT_AGENTS,
  getMemoryConnection as getRegistryMemory, runMigrations as runRegistryMigrations,
} from '@apex/registry';
import { AgentScheduler } from '../scheduler.js';
import { TaskRouter } from '../router.js';

function makeManifest(overrides?: Partial<ExecutionManifest>): ExecutionManifest {
  const now = new Date().toISOString();
  return {
    manifestId: 'manifest_001',
    projectId: 'project_001',
    version: '1.0',
    state: 'READY' as ManifestState,
    metadata: { requirement: '', specification: '', architecturePlan: '' },
    milestones: [{ id: 'm1', title: 'm1', description: '', taskIds: ['task_1', 'task_2'] }],
    tasks: [
      {
        taskId: 'task_1',
        title: 'Implement login',
        description: 'Build the login module',
        state: 'READY' as ManifestTaskState,
        dependsOn: [],
        outputs: ['login.ts'],
        owner: undefined,
        priority: 50,
      },
      {
        taskId: 'task_2',
        title: 'Review security',
        description: 'Security audit of auth flow',
        state: 'READY' as ManifestTaskState,
        dependsOn: [],
        outputs: ['audit.md'],
        owner: undefined,
        priority: 80,
      },
      {
        taskId: 'task_3',
        title: 'Already done task',
        description: 'Already complete',
        state: 'COMPLETE' as ManifestTaskState,
        dependsOn: [],
        outputs: [],
        owner: undefined,
        priority: 0,
      },
    ],
    constraints: [],
    reviewRequirements: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeManifest2(): ExecutionManifest {
  const now = new Date().toISOString();
  return {
    manifestId: 'manifest_002',
    projectId: 'project_001',
    version: '1.0',
    state: 'READY' as ManifestState,
    metadata: { requirement: '', specification: '', architecturePlan: '' },
    milestones: [],
    tasks: [
      {
        taskId: 'task_4',
        title: 'Implement logout',
        description: 'Build the logout module',
        state: 'READY' as ManifestTaskState,
        dependsOn: [],
        outputs: ['logout.ts'],
        owner: undefined,
        priority: 30,
      },
    ],
    constraints: [],
    reviewRequirements: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe('TaskRouter', () => {
  it('routes by preferredRole', () => {
    const router = new TaskRouter();
    const task = makeManifest().tasks[0];
    task.preferredRole = 'ENGINE';
    const agents = DEFAULT_AGENTS.filter((a) => a.status === 'IDLE');
    const result = router.route(task, agents);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('ENGINE');
  });

  it('routes by requiredCapabilities', () => {
    const router = new TaskRouter();
    const task = makeManifest().tasks[0];
    task.requiredCapabilities = ['reviewing', 'security'];
    const agents = DEFAULT_AGENTS.filter((a) => a.status === 'IDLE');
    const result = router.route(task, agents);
    expect(result).not.toBeNull();
    expect(result!.agentId).toBe('agent_security_reviewer');
  });

  it('routes by keyword fallback (review)', () => {
    const router = new TaskRouter();
    const task = makeManifest().tasks[1]; // "Review security"
    const agents = DEFAULT_AGENTS.filter((a) => a.status === 'IDLE');
    const result = router.route(task, agents);
    expect(result).not.toBeNull();
    expect(result!.agentId).toBe('agent_code_reviewer');
  });

  it('routes by keyword fallback (coding)', () => {
    const router = new TaskRouter();
    const task = makeManifest().tasks[0]; // "Implement login"
    const agents = DEFAULT_AGENTS.filter((a) => a.status === 'IDLE');
    const result = router.route(task, agents);
    expect(result).not.toBeNull();
    expect(result!.agentId).toBe('agent_engine');
  });

  it('returns null when no idle agents', () => {
    const router = new TaskRouter();
    const task = makeManifest().tasks[0];
    const agents = DEFAULT_AGENTS.map((a) => ({ ...a, status: 'BUSY' as const }));
    const result = router.route(task, agents);
    expect(result).toBeNull();
  });

  it('favors lower loadFactor', () => {
    const router = new TaskRouter();
    const task = makeManifest().tasks[0];
    task.preferredRole = 'ENGINE';
    const agents = DEFAULT_AGENTS.filter((a) => a.status === 'IDLE').map((a) => {
      if (a.role === 'ENGINE') return { ...a, loadFactor: 0.8 };
      return a;
    });
    const engineDef = DEFAULT_AGENTS.find((a) => a.role === 'ENGINE')!;
    agents.push({ ...engineDef, agentId: 'agent_engine2', loadFactor: 0.2 });
    const result = router.route(task, agents);
    expect(result).not.toBeNull();
    expect(result!.agentId).toBe('agent_engine2');
  });

  it('falls back to ENGINE when no keyword match', () => {
    const router = new TaskRouter();
    const task = makeManifest().tasks[0];
    task.title = 'Deploy pipeline';
    task.description = 'Set up CI/CD';
    const agents = DEFAULT_AGENTS.filter((a) => a.status === 'IDLE');
    const result = router.route(task, agents);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('ENGINE');
  });
});

describe('AgentScheduler', () => {
  let manifestStore: ManifestStore;
  let registry: AgentRegistry;
  let assignmentStore: AssignmentStore;
  let eventBus: TypedEventBus;
  let scheduler: AgentScheduler;
  const captured: string[] = [];

  beforeAll(() => {
    const manifestDb = getManifestMemory();
    runManifestMigrations(manifestDb);
    manifestStore = new ManifestStore(manifestDb);

    const registryDb = getRegistryMemory();
    runRegistryMigrations(registryDb);
    const agentStore = new AgentStore(registryDb);
    for (const agent of DEFAULT_AGENTS) agentStore.save(agent);
    assignmentStore = new AssignmentStore(registryDb);
    registry = new AgentRegistry();
    for (const agent of DEFAULT_AGENTS) registry.register(agent);

    eventBus = new TypedEventBus();
    const eventNames = [
      'TaskAssigned', 'AgentStarted', 'TaskStarted',
      'TaskCompleted', 'TaskFailed', 'AgentStopped',
      'ScheduleCreated', 'ScheduleCompleted', 'TaskUnassigned',
    ];
    for (const name of eventNames) {
      eventBus.on(name as keyof typeof eventBus.on, () => { captured.push(name); });
    }

    scheduler = new AgentScheduler(registry, manifestStore, assignmentStore, {
      eventBus,
      taskUpdater: {
        updateTaskState(_manifestId: string, _taskId: string, _state: ManifestTaskState) {
          captured.push(`updateTaskState:${_taskId}:${_state}`);
        },
      },
    });
  });

  it('schedules all READY tasks from a manifest', async () => {
    manifestStore.save(makeManifest());
    const result = await scheduler.scheduleManifest('manifest_001');
    expect(result.totalTasks).toBe(2);
    expect(result.assignedTasks).toBe(2);
    expect(result.skippedTasks).toBe(0);
    expect(result.assignments).toHaveLength(2);
    const task1Assign = result.assignments.find((a) => a.taskId === 'task_1')!;
    const task2Assign = result.assignments.find((a) => a.taskId === 'task_2')!;
    expect(task1Assign.agentId).toBe('agent_engine');
    expect(task2Assign.agentId).toBe('agent_code_reviewer');
  });

  it('emits lifecycle events on schedule', () => {
    const events = captured.filter(
      (e) => ['TaskAssigned', 'AgentStarted', 'TaskStarted', 'ScheduleCreated'].includes(e),
    );
    expect(events).toContain('TaskAssigned');
    expect(events).toContain('AgentStarted');
    expect(events).toContain('TaskStarted');
    expect(events).toContain('ScheduleCreated');
  });

  it('calls taskUpdater for each assigned task', () => {
    const updates = captured.filter((e) => e.startsWith('updateTaskState'));
    expect(updates.length).toBeGreaterThanOrEqual(2);
    expect(updates).toContain('updateTaskState:task_1:RUNNING');
    expect(updates).toContain('updateTaskState:task_2:RUNNING');
  });

  it('completes a task and emits events', async () => {
    const assign = scheduler.getAssignments('manifest_001');
    expect(assign.length).toBeGreaterThan(0);
    await scheduler.completeTask(assign[0].assignmentId, 'done');
    const completed = captured.filter((e) => e === 'TaskCompleted');
    expect(completed.length).toBeGreaterThanOrEqual(1);

    const reloaded = assignmentStore.load(assign[0].assignmentId);
    expect(reloaded!.status).toBe('COMPLETE');

    const agent = registry.getAgent(assign[0].agentId);
    expect(agent!.status).toBe('IDLE');
  });

  it('fails a task and emits events', async () => {
    const assign = scheduler.getAssignments('manifest_001');
    const activeAssign = assign.find((a) => a.status !== 'COMPLETE');
    if (!activeAssign) return;
    await scheduler.failTask(activeAssign.assignmentId, 'timeout');
    const failed = captured.filter((e) => e === 'TaskFailed');
    expect(failed.length).toBeGreaterThanOrEqual(1);

    const reloaded = assignmentStore.load(activeAssign.assignmentId);
    expect(reloaded!.status).toBe('FAILED');
  });

  it('cancels a manifest and emits TaskUnassigned', async () => {
    manifestStore.save(makeManifest2());
    await scheduler.scheduleManifest('manifest_002');
    await scheduler.cancelManifest('manifest_002');
    const unassigned = captured.filter((e) => e === 'TaskUnassigned');
    expect(unassigned.length).toBeGreaterThan(0);

    const assignments = scheduler.getAssignments('manifest_002');
    for (const a of assignments) {
      expect(a.status === 'CANCELLED' || a.status === 'ASSIGNED').toBe(true);
    }
  });

  it('throws for unknown manifest', async () => {
    await expect(scheduler.scheduleManifest('nonexistent'))
      .rejects.toThrow('Manifest not found: nonexistent');
  });

  it('returns scheduler status', () => {
    const status = scheduler.getStatus();
    expect(status).toHaveProperty('queuedTasks');
    expect(status).toHaveProperty('activeAssignments');
    expect(status).toHaveProperty('busyAgents');
  });

  it('handles cancel with no active assignments gracefully', async () => {
    await expect(scheduler.cancelManifest('nonexistent')).resolves.not.toThrow();
  });
});
