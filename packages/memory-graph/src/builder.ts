import { generateId, formatTimestamp } from '@apex/shared';
import type { ExecutionManifest, ManifestTask, Milestone } from '@apex/manifest';
import type { AgentSpec, AgentAssignment } from '@apex/registry';
import { GraphStore } from './types.js';
import { GraphEntity, GraphRelationship, GraphEntityKind, GraphRelationshipType } from './schema.js';

export interface ModelResolutionRecord {
  assignmentId: string;
  taskId: string;
  agentId: string;
  modelId: string;
  resolutionSource: string;
}

export interface ArchiveEntryRecord {
  id: string;
  summary: string;
  entityIds: string[];
  timestamp: string;
}

export class GraphBuilder {
  private store: GraphStore;

  constructor(store: GraphStore) {
    this.store = store;
  }

  private makeEntity(id: string, kind: GraphEntityKind, properties: Record<string, unknown>): GraphEntity {
    const now = formatTimestamp();
    return { id, kind, properties, createdAt: now, updatedAt: now };
  }

  private makeRel(id: string, sourceId: string, targetId: string, type: GraphRelationshipType, properties?: Record<string, unknown>): GraphRelationship {
    return { id, sourceId, targetId, type, properties, createdAt: formatTimestamp() };
  }

  ingestManifest(manifest: ExecutionManifest): void {
    const projectId = manifest.projectId;

    this.store.addEntity(this.makeEntity(projectId, 'PROJECT', {
      projectId,
      name: manifest.metadata?.requirement?.slice(0, 80) ?? '',
    }));

    this.store.addEntity(this.makeEntity(manifest.manifestId, 'MANIFEST', {
      manifestId: manifest.manifestId,
      projectId,
      version: manifest.version,
      state: manifest.state,
      taskCount: manifest.tasks.length,
    }));

    this.store.addRelationship(this.makeRel(
      generateId(), projectId, manifest.manifestId, 'CONTAINS',
    ));

    for (const milestone of manifest.milestones) {
      this.store.addEntity(this.makeEntity(milestone.id, 'MILESTONE', {
        title: milestone.title,
        description: milestone.description,
        taskIds: milestone.taskIds,
      }));

      this.store.addRelationship(this.makeRel(
        generateId(), manifest.manifestId, milestone.id, 'CONTAINS',
      ));
    }

    for (const task of manifest.tasks) {
      this.store.addEntity(this.makeEntity(task.taskId, 'TASK', {
        taskId: task.taskId,
        title: task.title,
        state: task.state,
        priority: task.priority,
        outputs: task.outputs,
        owner: task.owner,
        preferredRole: task.preferredRole,
      }));

      this.store.addRelationship(this.makeRel(
        generateId(), manifest.manifestId, task.taskId, 'CONTAINS',
      ));

      const parentMilestone = manifest.milestones.find((m: Milestone) => m.taskIds.includes(task.taskId));
      if (parentMilestone) {
        this.store.addRelationship(this.makeRel(
          generateId(), parentMilestone.id, task.taskId, 'CONTAINS',
        ));
      }

      for (const dep of task.dependsOn) {
        this.store.addRelationship(this.makeRel(
          generateId(), task.taskId, dep, 'DEPENDS_ON',
        ));
      }

      for (const output of task.outputs) {
        this.store.addEntity(this.makeEntity(output, 'ARTIFACT', {
          name: output,
          producedBy: task.taskId,
        }));
        this.store.addRelationship(this.makeRel(
          generateId(), task.taskId, output, 'PRODUCES',
        ));
      }
    }

    for (const constraint of manifest.constraints) {
      this.store.addEntity(this.makeEntity(constraint.id, 'CONSTRAINT', {
        type: constraint.type,
        description: constraint.description,
      }));
      this.store.addRelationship(this.makeRel(
        generateId(), manifest.manifestId, constraint.id, 'CONTAINS',
      ));
    }
  }

  ingestAgent(agent: AgentSpec): void {
    this.store.addEntity(this.makeEntity(agent.agentId, 'AGENT', {
      agentId: agent.agentId,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      capabilities: agent.capabilities,
      preferredProfile: agent.preferredProfile,
      preferredModel: agent.preferredModel,
      loadFactor: agent.loadFactor,
    }));
  }

  ingestAssignment(assignment: AgentAssignment, resolvedModel?: string): void {
    this.store.addEntity(this.makeEntity(assignment.assignmentId, 'ASSIGNMENT', {
      assignmentId: assignment.assignmentId,
      taskId: assignment.taskId,
      agentId: assignment.agentId,
      manifestId: assignment.manifestId,
      status: assignment.status,
      resolvedModel: resolvedModel ?? assignment.resolvedModel,
      correlationId: assignment.correlationId,
      parentAssignmentId: assignment.parentAssignmentId,
    }));

    this.store.addRelationship(this.makeRel(
      generateId(), assignment.assignmentId, assignment.taskId, 'BELONGS_TO',
    ));

    this.store.addRelationship(this.makeRel(
      generateId(), assignment.assignmentId, assignment.agentId, 'EXECUTED_BY',
    ));

    if (resolvedModel) {
      this.ensureModelEntity(resolvedModel);
      this.store.addRelationship(this.makeRel(
        generateId(), assignment.assignmentId, resolvedModel, 'USES_MODEL',
        { taskId: assignment.taskId, agentId: assignment.agentId },
      ));
    } else if (assignment.resolvedModel) {
      this.ensureModelEntity(assignment.resolvedModel);
      this.store.addRelationship(this.makeRel(
        generateId(), assignment.assignmentId, assignment.resolvedModel, 'USES_MODEL',
        { taskId: assignment.taskId, agentId: assignment.agentId },
      ));
    }
  }

  ingestModelResolution(record: ModelResolutionRecord): void {
    this.ensureModelEntity(record.modelId);
    this.store.addRelationship(this.makeRel(
      generateId(), record.assignmentId, record.modelId, 'USES_MODEL',
      { taskId: record.taskId, agentId: record.agentId, resolutionSource: record.resolutionSource },
    ));
  }

  ingestArchiveEntry(entry: ArchiveEntryRecord): void {
    this.store.addEntity(this.makeEntity(entry.id, 'ARCHIVE_ENTRY', {
      summary: entry.summary,
      entityIds: entry.entityIds,
    }));

    for (const entityId of entry.entityIds) {
      this.store.addRelationship(this.makeRel(
        generateId(), entry.id, entityId, 'RELATES_TO',
      ));
    }
  }

  private ensureModelEntity(modelId: string): void {
    if (!this.store.getEntity(modelId)) {
      this.store.addEntity(this.makeEntity(modelId, 'MODEL', {
        modelId,
        provider: 'opencode',
        displayName: modelId === 'big-pickle' ? 'Big Pickle' : modelId,
      }));
    }
  }
}
