import { generateId, formatTimestamp } from '@apex/shared';
import { GraphEntity, GraphRelationship, GraphSnapshot, GraphQuery, GraphQuerySchema } from './schema.js';
import { GraphStore } from './types.js';

export class InMemoryGraphStore implements GraphStore {
  private entities: Map<string, GraphEntity> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();

  addEntity(entity: GraphEntity): void {
    this.entities.set(entity.id, { ...entity, updatedAt: entity.updatedAt || entity.createdAt });
  }

  getEntity(id: string): GraphEntity | undefined {
    return this.entities.get(id) ? { ...this.entities.get(id)! } : undefined;
  }

  findEntities(kind: string, filter?: Partial<GraphEntity>): GraphEntity[] {
    return Array.from(this.entities.values()).filter((e) => {
      if (e.kind !== kind) return false;
      if (!filter) return true;
      return Object.entries(filter).every(([key, value]) => {
        if (key === 'id' || key === 'kind') return (e as any)[key] === value;
        if (key === 'properties' && typeof value === 'object' && value !== null) {
          return Object.entries(value).every(([pk, pv]) => (e.properties as any)[pk] === pv);
        }
        return (e.properties as any)[key] === value;
      });
    });
  }

  updateEntity(id: string, updates: Partial<GraphEntity>): boolean {
    const existing = this.entities.get(id);
    if (!existing) return false;
    this.entities.set(id, {
      ...existing,
      ...updates,
      id,
      kind: existing.kind,
      updatedAt: formatTimestamp(),
      properties: updates.properties ? { ...existing.properties, ...updates.properties } : existing.properties,
    });
    return true;
  }

  addRelationship(rel: GraphRelationship): void {
    this.relationships.set(rel.id, { ...rel });
  }

  getRelationship(id: string): GraphRelationship | undefined {
    return this.relationships.get(id) ? { ...this.relationships.get(id)! } : undefined;
  }

  getRelationships(entityId: string, type?: string): GraphRelationship[] {
    return Array.from(this.relationships.values()).filter((r) => {
      if (r.sourceId !== entityId && r.targetId !== entityId) return false;
      if (type && r.type !== type) return false;
      return true;
    });
  }

  traverse(fromId: string, query: GraphQuery): GraphEntity[] {
    const validated = GraphQuerySchema.parse(query);
    const visited = new Set<string>();
    const result: GraphEntity[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: fromId, depth: 0 }];
    visited.add(fromId);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= validated.maxDepth) continue;

      const neighborIds = new Set<string>();
      for (const rel of this.relationships.values()) {
        if (!validated.relationshipTypes || validated.relationshipTypes.length === 0 || validated.relationshipTypes.includes(rel.type)) {
          if (rel.sourceId === id) neighborIds.add(rel.targetId);
          if (rel.targetId === id) neighborIds.add(rel.sourceId);
        }
      }

      for (const nid of neighborIds) {
        if (visited.has(nid)) continue;
        visited.add(nid);
        const entity = this.entities.get(nid);
        if (entity && (!validated.kinds || validated.kinds.length === 0 || validated.kinds.includes(entity.kind as any))) {
          result.push({ ...entity });
        }
        queue.push({ id: nid, depth: depth + 1 });
      }
    }

    return result;
  }

  findPath(fromId: string, toId: string): GraphRelationship[] {
    const visited = new Set<string>();
    const parent = new Map<string, { parentId: string; rel: GraphRelationship }>();
    const queue: string[] = [fromId];
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === toId) break;

      for (const rel of this.relationships.values()) {
        let neighbor: string | null = null;
        if (rel.sourceId === current) neighbor = rel.targetId;
        if (rel.targetId === current) neighbor = rel.sourceId;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, { parentId: current, rel });
          queue.push(neighbor);
        }
      }
    }

    if (!parent.has(toId)) return [];

    const path: GraphRelationship[] = [];
    let current = toId;
    while (current !== fromId) {
      const entry = parent.get(current);
      if (!entry) break;
      path.unshift(entry.rel);
      current = entry.parentId;
    }
    return path;
  }

  getSubgraph(entityId: string): GraphSnapshot {
    const entities: GraphEntity[] = [];
    const relationships: GraphRelationship[] = [];
    const visited = new Set<string>();
    const queue: string[] = [entityId];
    visited.add(entityId);

    const root = this.entities.get(entityId);
    if (root) entities.push({ ...root });

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const rel of this.relationships.values()) {
        let neighbor: string | null = null;
        if (rel.sourceId === current) neighbor = rel.targetId;
        if (rel.targetId === current) neighbor = rel.sourceId;

        if (neighbor) {
          if (!relationships.find((r) => r.id === rel.id)) {
            relationships.push({ ...rel });
          }
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            const entity = this.entities.get(neighbor);
            if (entity) entities.push({ ...entity });
            queue.push(neighbor);
          }
        }
      }
    }

    return { entities, relationships, createdAt: formatTimestamp() };
  }

  clear(): void {
    this.entities.clear();
    this.relationships.clear();
  }

  stats(): { entities: number; relationships: number } {
    return { entities: this.entities.size, relationships: this.relationships.size };
  }
}
