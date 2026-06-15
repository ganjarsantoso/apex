import type { GraphStore, GraphEntity, GraphRelationship } from '@apex/memory-graph';
import type { RelatedContext } from './types.js';

export class ContextRetriever {
  constructor(private graphStore: GraphStore) {}

  getRelatedContext(taskId: string): RelatedContext {
    const task = this.graphStore.getEntity(taskId);
    if (!task) {
      return { taskId, milestone: null, siblings: [], assignedAgent: null, blockers: [], previousTasks: [] };
    }

    const allRels = this.graphStore.getRelationships(taskId);

    const parentRels = allRels.filter(r => r.type === 'CONTAINS' && r.targetId === taskId);
    const parentId = parentRels.length > 0 ? parentRels[0].sourceId : null;

    let milestone: { id: string; title: string } | null = null;
    let siblings: Array<{ id: string; title: string; state: string }> = [];

    if (parentId) {
      const parentEntity = this.graphStore.getEntity(parentId);
      if (parentEntity?.kind === 'MILESTONE') {
        milestone = {
          id: parentEntity.id,
          title: (parentEntity.properties.title as string) ?? parentEntity.id,
        };
        const msRels = this.graphStore.getRelationships(parentEntity.id);
        const childIds = msRels
          .filter(r => r.type === 'CONTAINS' && r.sourceId === parentEntity.id && r.targetId !== taskId)
          .map(r => r.targetId);
        siblings = childIds.map(id => {
          const e = this.graphStore.getEntity(id);
          return {
            id,
            title: (e?.properties.title as string) ?? id,
            state: (e?.properties.state as string) ?? 'UNKNOWN',
          };
        });
      } else if (parentEntity?.kind === 'MANIFEST') {
        const msRels = this.graphStore.getRelationships(parentEntity.id);
        const childIds = msRels
          .filter(r => r.type === 'CONTAINS' && r.targetId !== taskId)
          .map(r => r.targetId);
        siblings = childIds.map(id => {
          const e = this.graphStore.getEntity(id);
          return {
            id,
            title: (e?.properties.title as string) ?? id,
            state: (e?.properties.state as string) ?? 'UNKNOWN',
          };
        });
      }
    }

    const assignmentRels = allRels.filter(r => r.type === 'BELONGS_TO' && r.sourceId.startsWith('a'));
    let assignedAgent: { id: string; name: string } | null = null;
    for (const rel of assignmentRels) {
      const assignmentEntity = this.graphStore.getEntity(rel.sourceId);
      if (assignmentEntity) {
        const agentRels = this.graphStore.getRelationships(assignmentEntity.id);
        const execRel = agentRels.find(r => r.type === 'EXECUTED_BY');
        if (execRel) {
          const agentEntity = this.graphStore.getEntity(execRel.targetId);
          if (agentEntity) {
            assignedAgent = {
              id: agentEntity.id,
              name: (agentEntity.properties.name as string) ?? agentEntity.id,
            };
            break;
          }
        }
      }
    }

    const depRels = allRels.filter(r => r.type === 'DEPENDS_ON' && r.sourceId === taskId);
    const blockers: Array<{ id: string; title: string }> = [];
    for (const rel of depRels) {
      const depEntity = this.graphStore.getEntity(rel.targetId);
      if (depEntity && (depEntity.properties.state as string) === 'BLOCKED') {
        blockers.push({
          id: depEntity.id,
          title: (depEntity.properties.title as string) ?? depEntity.id,
        });
      }
    }

    const previousRels = allRels.filter(r => r.type === 'PRECEDES' && r.sourceId === taskId);
    const previousTasks = previousRels.map(rel => {
      const e = this.graphStore.getEntity(rel.targetId);
      return {
        id: rel.targetId,
        title: (e?.properties.title as string) ?? rel.targetId,
        state: (e?.properties.state as string) ?? 'UNKNOWN',
      };
    });

    return {
      taskId,
      milestone,
      siblings,
      assignedAgent,
      blockers,
      previousTasks,
    };
  }

  getRelatedTasks(manifestId: string): string[] {
    const rels = this.graphStore.getRelationships(manifestId);
    return rels
      .filter(r => r.type === 'CONTAINS' && r.sourceId === manifestId)
      .map(r => r.targetId);
  }

  getBlockersForTask(taskId: string): GraphEntity[] {
    const rels = this.graphStore.getRelationships(taskId);
    const depIds = rels
      .filter(r => r.type === 'DEPENDS_ON' && r.sourceId === taskId)
      .map(r => r.targetId);

    return depIds
      .map(id => this.graphStore.getEntity(id))
      .filter((e): e is GraphEntity => e !== undefined && (e.properties.state as string) === 'BLOCKED');
  }

  getAssignedAgent(assignmentId: string): GraphEntity | undefined {
    const rels = this.graphStore.getRelationships(assignmentId);
    const execRel = rels.find(r => r.type === 'EXECUTED_BY');
    return execRel ? this.graphStore.getEntity(execRel.targetId) : undefined;
  }
}
