import { GraphEntity, GraphRelationship, GraphSnapshot, GraphQuery } from './schema.js';

export interface GraphStore {
  addEntity(entity: GraphEntity): void;
  getEntity(id: string): GraphEntity | undefined;
  findEntities(kind: string, filter?: Partial<GraphEntity>): GraphEntity[];
  updateEntity(id: string, updates: Partial<GraphEntity>): boolean;

  addRelationship(rel: GraphRelationship): void;
  getRelationship(id: string): GraphRelationship | undefined;
  getRelationships(entityId: string, type?: string): GraphRelationship[];

  traverse(fromId: string, query: GraphQuery): GraphEntity[];
  findPath(fromId: string, toId: string): GraphRelationship[];
  getSubgraph(entityId: string): GraphSnapshot;

  clear(): void;
  stats(): { entities: number; relationships: number };
}
