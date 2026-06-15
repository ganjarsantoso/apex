import { TypedEventBus } from '@apex/events';
import { AgentAssignment, AgentRegistry, AssignmentStore } from '@apex/registry';
import { ManifestStore } from '@apex/manifest';
import { generateId, formatTimestamp } from '@apex/shared';
import { ManifestTaskState } from '@apex/types';
import { ModelResolver } from '@apex/model-router';
import { TaskRouter } from './router.js';
import { ManifestTaskUpdater, DefaultManifestTaskUpdater } from './task-updater.js';
import { ScheduleResult, SchedulerStatus } from './types.js';

export class AgentScheduler {
  private registry: AgentRegistry;
  private eventBus: TypedEventBus;
  private router: TaskRouter;
  private taskUpdater: ManifestTaskUpdater;
  private assignmentStore: AssignmentStore;
  private manifestStore: ManifestStore;
  private modelResolver?: ModelResolver;

  constructor(
    registry: AgentRegistry,
    manifestStore: ManifestStore,
    assignmentStore: AssignmentStore,
    options?: {
      eventBus?: TypedEventBus;
      router?: TaskRouter;
      taskUpdater?: ManifestTaskUpdater;
      modelResolver?: ModelResolver;
    },
  ) {
    this.registry = registry;
    this.manifestStore = manifestStore;
    this.assignmentStore = assignmentStore;
    this.eventBus = options?.eventBus ?? new TypedEventBus();
    this.router = options?.router ?? new TaskRouter();
    this.taskUpdater = options?.taskUpdater ?? new DefaultManifestTaskUpdater(manifestStore);
    this.modelResolver = options?.modelResolver;
  }

  async scheduleManifest(manifestId: string): Promise<ScheduleResult> {
    const manifest = this.manifestStore.load(manifestId);
    if (!manifest) {
      throw new Error(`Manifest not found: ${manifestId}`);
    }

    const agents = this.registry.list();
    const now = formatTimestamp();
    const assignments: ScheduleResult['assignments'] = [];
    let assigned = 0;
    let skipped = 0;

    const readyTasks = manifest.tasks.filter((t) => t.state === 'READY');

    for (const task of readyTasks) {
      const agent = this.router.route(task, agents);
      if (!agent) {
        skipped++;
        continue;
      }

      const assignmentId = generateId();
      const resolution = this.modelResolver
        ? this.modelResolver.resolve(agent.agentId, task.taskId)
        : undefined;
      const assignment: AgentAssignment = {
        assignmentId,
        taskId: task.taskId,
        agentId: agent.agentId,
        manifestId: manifest.manifestId,
        status: 'ASSIGNED',
        createdAt: now,
        correlationId: manifest.manifestId,
        resolvedModel: resolution?.modelId,
      };

      this.assignmentStore.save(assignment);
      this.registry.updateStatus(agent.agentId, 'BUSY');
      this.taskUpdater.updateTaskState(manifest.manifestId, task.taskId, 'RUNNING' as ManifestTaskState);

      await this.eventBus.emit('TaskAssigned', {
        version: '1.0',
        eventId: generateId(),
        correlationId: manifest.manifestId,
        timestamp: now,
        source: 'scheduler',
        taskId: task.taskId,
        agentId: agent.agentId,
        manifestId: manifest.manifestId,
        assignmentId,
      });

      await this.eventBus.emit('AgentStarted', {
        version: '1.0',
        eventId: generateId(),
        correlationId: manifest.manifestId,
        timestamp: now,
        source: 'scheduler',
        agentId: agent.agentId,
        taskId: task.taskId,
        manifestId: manifest.manifestId,
        role: agent.role,
      });

      await this.eventBus.emit('TaskStarted', {
        version: '1.0',
        eventId: generateId(),
        correlationId: manifest.manifestId,
        timestamp: now,
        source: 'scheduler',
        taskId: task.taskId,
      });

      assignments.push({ taskId: task.taskId, assignmentId, agentId: agent.agentId, status: 'ASSIGNED' });
      assigned++;
    }

    if (assignments.length > 0) {
      await this.eventBus.emit('ScheduleCreated', {
        version: '1.0',
        eventId: generateId(),
        correlationId: manifest.manifestId,
        timestamp: now,
        source: 'scheduler',
        manifestId: manifest.manifestId,
        projectId: manifest.projectId,
        taskCount: assignments.length,
      });
    }

    return {
      manifestId: manifest.manifestId,
      totalTasks: readyTasks.length,
      assignedTasks: assigned,
      skippedTasks: skipped,
      assignments,
    };
  }

  async completeTask(assignmentId: string, result: string): Promise<void> {
    const assignment = this.assignmentStore.load(assignmentId);
    if (!assignment) throw new Error(`Assignment not found: ${assignmentId}`);

    const now = formatTimestamp();
    this.assignmentStore.updateStatus(assignmentId, 'COMPLETE');
    this.registry.updateStatus(assignment.agentId, 'IDLE');
    this.taskUpdater.updateTaskState(assignment.manifestId, assignment.taskId, 'COMPLETE' as ManifestTaskState);

    const startTime = assignment.startedAt ? new Date(assignment.startedAt).getTime() : Date.now();
    const duration = Date.now() - startTime;

    await this.eventBus.emit('TaskCompleted', {
      version: '1.0',
      eventId: generateId(),
      correlationId: assignment.correlationId ?? assignment.manifestId,
      timestamp: now,
      source: 'scheduler',
      taskId: assignment.taskId,
      result,
    });

    await this.eventBus.emit('AgentStopped', {
      version: '1.0',
      eventId: generateId(),
      correlationId: assignment.correlationId ?? assignment.manifestId,
      timestamp: now,
      source: 'scheduler',
      agentId: assignment.agentId,
      taskId: assignment.taskId,
      manifestId: assignment.manifestId,
      role: '',
      duration,
      result,
    });

    await this.emitScheduleCompletedIfDone(assignment.manifestId);
  }

  async failTask(assignmentId: string, reason: string): Promise<void> {
    const assignment = this.assignmentStore.load(assignmentId);
    if (!assignment) throw new Error(`Assignment not found: ${assignmentId}`);

    const now = formatTimestamp();
    this.assignmentStore.updateStatus(assignmentId, 'FAILED');
    this.registry.updateStatus(assignment.agentId, 'IDLE');
    this.taskUpdater.updateTaskState(assignment.manifestId, assignment.taskId, 'FAILED' as ManifestTaskState);

    const startTime = assignment.startedAt ? new Date(assignment.startedAt).getTime() : Date.now();
    const duration = Date.now() - startTime;

    await this.eventBus.emit('TaskFailed', {
      version: '1.0',
      eventId: generateId(),
      correlationId: assignment.correlationId ?? assignment.manifestId,
      timestamp: now,
      source: 'scheduler',
      taskId: assignment.taskId,
      reason,
    });

    await this.eventBus.emit('AgentStopped', {
      version: '1.0',
      eventId: generateId(),
      correlationId: assignment.correlationId ?? assignment.manifestId,
      timestamp: now,
      source: 'scheduler',
      agentId: assignment.agentId,
      taskId: assignment.taskId,
      manifestId: assignment.manifestId,
      role: '',
      duration,
      result: `failed: ${reason}`,
    });

    await this.emitScheduleCompletedIfDone(assignment.manifestId);
  }

  async cancelManifest(manifestId: string): Promise<void> {
    const assignments = this.getAssignments(manifestId);
    const now = formatTimestamp();

    for (const assignment of assignments) {
      if (assignment.status === 'ASSIGNED' || assignment.status === 'ACTIVE') {
        this.assignmentStore.updateStatus(assignment.assignmentId, 'CANCELLED');
        this.registry.updateStatus(assignment.agentId, 'IDLE');

        await this.eventBus.emit('TaskUnassigned', {
          version: '1.0',
          eventId: generateId(),
          correlationId: assignment.correlationId ?? manifestId,
          timestamp: now,
          source: 'scheduler',
          taskId: assignment.taskId,
          agentId: assignment.agentId,
          assignmentId: assignment.assignmentId,
        });
      }
    }
  }

  getAssignments(manifestId: string): AgentAssignment[] {
    return this.assignmentStore.getByManifest(manifestId);
  }

  getStatus(): SchedulerStatus {
    const allAssignments = this.assignmentStore.listActive();
    const allAgents = this.registry.list();
    const all = this.registry.getStats();

    return {
      queuedTasks: allAssignments.filter((a) => a.status === 'PENDING' || a.status === 'ASSIGNED').length,
      activeAssignments: allAssignments.filter((a) => a.status === 'ACTIVE').length,
      completedAssignments: allAgents.length === 0 ? 0 : 0,
      failedAssignments: 0,
      idleAgents: all.idle,
      busyAgents: all.busy,
    };
  }

  private async emitScheduleCompletedIfDone(manifestId: string): Promise<void> {
    const manifest = this.manifestStore.load(manifestId);
    if (!manifest) return;

    const allDone = manifest.tasks.every(
      (t) => t.state === 'COMPLETE' || t.state === 'FAILED',
    );
    if (!allDone) return;

    const completed = manifest.tasks.filter((t) => t.state === 'COMPLETE').length;
    const failed = manifest.tasks.filter((t) => t.state === 'FAILED').length;

    await this.eventBus.emit('ScheduleCompleted', {
      version: '1.0',
      eventId: generateId(),
      correlationId: manifestId,
      timestamp: formatTimestamp(),
      source: 'scheduler',
      manifestId,
      projectId: manifest.projectId,
      totalTasks: manifest.tasks.length,
      completedTasks: completed,
      failedTasks: failed,
      result: failed === 0 ? 'success' : 'partial',
    });
  }
}
