import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryGraphStore } from '../store.js';
import { GraphBuilder } from '../builder.js';
import { MemoryGraph } from '../index.js';
import { GraphEntityKindEnum, GraphRelationshipTypeEnum } from '../schema.js';
import type { ExecutionManifest, ManifestTask } from '@apex/manifest';
import type { AgentSpec, AgentAssignment } from '@apex/registry';

function makeTimestamp(): string {
  return new Date().toISOString();
}

const NOW = makeTimestamp();

function dummyManifest(overrides?: Partial<ExecutionManifest>): ExecutionManifest {
  return {
    manifestId: 'm1',
    projectId: 'p1',
    version: '1.0',
    state: 'READY' as any,
    metadata: { requirement: 'Test requirement', specification: 'Spec', architecturePlan: 'Plan' },
    milestones: [
      { id: 'ms1', title: 'Milestone 1', description: 'First milestone', taskIds: ['t1'] },
    ],
    tasks: [
      { taskId: 't1', title: 'Task 1', description: 'First task', state: 'PENDING' as any, dependsOn: [], outputs: ['output_a'], priority: 50 },
      { taskId: 't2', title: 'Task 2', description: 'Second task', state: 'READY' as any, dependsOn: ['t1'], outputs: [], priority: 30, owner: 'engine' },
    ],
    constraints: [
      { id: 'c1', type: 'SECURITY' as any, description: 'Must pass security review' },
    ],
    reviewRequirements: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function dummyAgent(overrides?: Partial<AgentSpec>): AgentSpec {
  return {
    agentId: 'agent_engine',
    name: 'engine',
    role: 'ENGINE' as any,
    status: 'IDLE',
    enabled: true,
    capabilities: { planning: false, coding: true, testing: true, reviewing: false, security: false, orchestration: false },
    preferredProfile: 'execution',
    preferredModel: 'big-pickle',
    loadFactor: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function dummyAssignment(overrides?: Partial<AgentAssignment>): AgentAssignment {
  return {
    assignmentId: 'a1',
    taskId: 't1',
    agentId: 'agent_engine',
    manifestId: 'm1',
    status: 'ASSIGNED',
    createdAt: NOW,
    resolvedModel: 'big-pickle',
    ...overrides,
  };
}

describe('InMemoryGraphStore', () => {
  let store: InMemoryGraphStore;

  beforeEach(() => {
    store = new InMemoryGraphStore();
  });

  it('starts empty', () => {
    expect(store.stats()).toEqual({ entities: 0, relationships: 0 });
  });

  it('adds and retrieves an entity', () => {
    store.addEntity({ id: 'e1', kind: 'PROJECT', properties: { name: 'Test' }, createdAt: NOW, updatedAt: NOW });
    const entity = store.getEntity('e1');
    expect(entity).toBeDefined();
    expect(entity!.id).toBe('e1');
    expect(entity!.kind).toBe('PROJECT');
  });

  it('returns undefined for missing entity', () => {
    expect(store.getEntity('nonexistent')).toBeUndefined();
  });

  it('finds entities by kind', () => {
    store.addEntity({ id: 'e1', kind: 'TASK', properties: { title: 'A' }, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'e2', kind: 'TASK', properties: { title: 'B' }, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'e3', kind: 'AGENT', properties: {}, createdAt: NOW, updatedAt: NOW });
    const tasks = store.findEntities('TASK');
    expect(tasks).toHaveLength(2);
  });

  it('finds entities by kind and property filter', () => {
    store.addEntity({ id: 'e1', kind: 'TASK', properties: { priority: 50, owner: 'engine' }, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'e2', kind: 'TASK', properties: { priority: 30 }, createdAt: NOW, updatedAt: NOW });
    const result = store.findEntities('TASK', { properties: { owner: 'engine' } } as any);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });

  it('updates an existing entity', () => {
    store.addEntity({ id: 'e1', kind: 'TASK', properties: { state: 'PENDING' }, createdAt: NOW, updatedAt: NOW });
    const ok = store.updateEntity('e1', { properties: { state: 'RUNNING' } });
    expect(ok).toBe(true);
    const updated = store.getEntity('e1')!;
    expect(updated.properties.state).toBe('RUNNING');
  });

  it('returns false when updating nonexistent entity', () => {
    expect(store.updateEntity('nope', { properties: {} })).toBe(false);
  });

  it('adds and retrieves a relationship', () => {
    store.addEntity({ id: 'e1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'e2', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'e1', targetId: 'e2', type: 'DEPENDS_ON', createdAt: NOW });
    const rel = store.getRelationship('r1');
    expect(rel).toBeDefined();
    expect(rel!.type).toBe('DEPENDS_ON');
  });

  it('gets relationships for an entity', () => {
    store.addEntity({ id: 'e1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'e2', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'e3', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'e1', targetId: 'e2', type: 'DEPENDS_ON', createdAt: NOW });
    store.addRelationship({ id: 'r2', sourceId: 'e1', targetId: 'e3', type: 'BLOCKS', createdAt: NOW });
    const rels = store.getRelationships('e1');
    expect(rels).toHaveLength(2);
  });

  it('filters relationships by type', () => {
    store.addEntity({ id: 'e1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'e2', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'e1', targetId: 'e2', type: 'DEPENDS_ON', createdAt: NOW });
    store.addRelationship({ id: 'r2', sourceId: 'e2', targetId: 'e1', type: 'BLOCKS', createdAt: NOW });
    const deps = store.getRelationships('e1', 'DEPENDS_ON');
    expect(deps).toHaveLength(1);
    expect(deps[0].type).toBe('DEPENDS_ON');
  });

  it('traverses from a node', () => {
    store.addEntity({ id: 'root', kind: 'PROJECT', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'm1', kind: 'MANIFEST', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 't1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'root', targetId: 'm1', type: 'CONTAINS', createdAt: NOW });
    store.addRelationship({ id: 'r2', sourceId: 'm1', targetId: 't1', type: 'CONTAINS', createdAt: NOW });

    const result = store.traverse('root', { fromId: 'root', maxDepth: 2 });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toContain('m1');
    expect(result.map(r => r.id)).toContain('t1');
  });

  it('traverses respects maxDepth', () => {
    store.addEntity({ id: 'root', kind: 'PROJECT', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'm1', kind: 'MANIFEST', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 't1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'root', targetId: 'm1', type: 'CONTAINS', createdAt: NOW });
    store.addRelationship({ id: 'r2', sourceId: 'm1', targetId: 't1', type: 'CONTAINS', createdAt: NOW });

    const result = store.traverse('root', { fromId: 'root', maxDepth: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('m1');
  });

  it('traverses filters by kind', () => {
    store.addEntity({ id: 'root', kind: 'PROJECT', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'm1', kind: 'MANIFEST', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 't1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'root', targetId: 'm1', type: 'CONTAINS', createdAt: NOW });
    store.addRelationship({ id: 'r2', sourceId: 'm1', targetId: 't1', type: 'CONTAINS', createdAt: NOW });

    const result = store.traverse('root', { fromId: 'root', maxDepth: 3, kinds: ['TASK'] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });

  it('finds a path between two nodes', () => {
    store.addEntity({ id: 'a', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'b', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'c', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'a', targetId: 'b', type: 'DEPENDS_ON', createdAt: NOW });
    store.addRelationship({ id: 'r2', sourceId: 'b', targetId: 'c', type: 'DEPENDS_ON', createdAt: NOW });

    const path = store.findPath('a', 'c');
    expect(path).toHaveLength(2);
    expect(path[0].id).toBe('r1');
    expect(path[1].id).toBe('r2');
  });

  it('returns empty path when no path exists', () => {
    store.addEntity({ id: 'a', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 'z', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    expect(store.findPath('a', 'z')).toEqual([]);
  });

  it('returns subgraph snapshot for an entity', () => {
    store.addEntity({ id: 'm1', kind: 'MANIFEST', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addEntity({ id: 't1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'm1', targetId: 't1', type: 'CONTAINS', createdAt: NOW });

    const snapshot = store.getSubgraph('m1');
    expect(snapshot.entities).toHaveLength(2);
    expect(snapshot.relationships).toHaveLength(1);
    expect(snapshot.createdAt).toBeDefined();
  });

  it('clear removes all data', () => {
    store.addEntity({ id: 'e1', kind: 'TASK', properties: {}, createdAt: NOW, updatedAt: NOW });
    store.addRelationship({ id: 'r1', sourceId: 'e1', targetId: 'e1', type: 'RELATES_TO', createdAt: NOW });
    expect(store.stats().entities).toBe(1);
    store.clear();
    expect(store.stats()).toEqual({ entities: 0, relationships: 0 });
  });
});

describe('GraphBuilder', () => {
  let store: InMemoryGraphStore;
  let builder: GraphBuilder;

  beforeEach(() => {
    store = new InMemoryGraphStore();
    builder = new GraphBuilder(store);
  });

  it('ingests a manifest and creates entities', () => {
    const manifest = dummyManifest();
    builder.ingestManifest(manifest);

    expect(store.getEntity('p1')).toBeDefined();
    expect(store.getEntity('m1')).toBeDefined();
    expect(store.getEntity('ms1')).toBeDefined();
    expect(store.getEntity('t1')).toBeDefined();
    expect(store.getEntity('t2')).toBeDefined();
    expect(store.getEntity('c1')).toBeDefined();
  });

  it('creates artifact entities for task outputs', () => {
    builder.ingestManifest(dummyManifest());
    const artifact = store.getEntity('output_a');
    expect(artifact).toBeDefined();
    expect(artifact!.kind).toBe('ARTIFACT');
  });

  it('creates CONTAINS relationship between project and manifest', () => {
    builder.ingestManifest(dummyManifest());
    const rels = store.findPath('p1', 'm1');
    expect(rels).toHaveLength(1);
    expect(rels[0].type).toBe('CONTAINS');
  });

  it('creates DEPENDS_ON relationships from task dependencies', () => {
    builder.ingestManifest(dummyManifest());
    const rels = store.getRelationships('t2');
    const depRels = rels.filter(r => r.type === 'DEPENDS_ON');
    expect(depRels).toHaveLength(1);
    expect(depRels[0].targetId).toBe('t1');
  });

  it('creates PRODUCES relationships for task outputs', () => {
    builder.ingestManifest(dummyManifest());
    const rels = store.getRelationships('t1');
    const produceRels = rels.filter(r => r.type === 'PRODUCES');
    expect(produceRels).toHaveLength(1);
  });

  it('creates CONTAINS relationship from milestone to task', () => {
    builder.ingestManifest(dummyManifest());
    const rels = store.findPath('ms1', 't1');
    expect(rels).toHaveLength(1);
    expect(rels[0].type).toBe('CONTAINS');
  });

  it('ingests an agent', () => {
    const agent = dummyAgent();
    builder.ingestAgent(agent);
    const entity = store.getEntity('agent_engine');
    expect(entity).toBeDefined();
    expect(entity!.kind).toBe('AGENT');
    expect(entity!.properties.role).toBe('ENGINE');
  });

  it('ingests an assignment with resolved model', () => {
    builder.ingestAgent(dummyAgent());
    builder.ingestManifest(dummyManifest());
    const assignment = dummyAssignment();
    builder.ingestAssignment(assignment);

    const assEntity = store.getEntity('a1');
    expect(assEntity).toBeDefined();
    expect(assEntity!.kind).toBe('ASSIGNMENT');

    const taskRels = store.getRelationships('a1', 'BELONGS_TO');
    expect(taskRels).toHaveLength(1);
    expect(taskRels[0].targetId).toBe('t1');

    const agentRels = store.getRelationships('a1', 'EXECUTED_BY');
    expect(agentRels).toHaveLength(1);
    expect(agentRels[0].targetId).toBe('agent_engine');

    const modelRels = store.getRelationships('a1', 'USES_MODEL');
    expect(modelRels).toHaveLength(1);
    expect(modelRels[0].targetId).toBe('big-pickle');
  });

  it('ingests assignment without resolved model (falls back to assignment.resolvedModel)', () => {
    builder.ingestAgent(dummyAgent());
    builder.ingestManifest(dummyManifest());
    builder.ingestAssignment(dummyAssignment({ resolvedModel: 'big-pickle' }));
    const modelRels = store.getRelationships('a1', 'USES_MODEL');
    expect(modelRels).toHaveLength(1);
    expect(modelRels[0].targetId).toBe('big-pickle');
  });

  it('ingests a model resolution record', () => {
    builder.ingestAssignment(dummyAssignment());
    builder.ingestModelResolution({
      assignmentId: 'a1',
      taskId: 't1',
      agentId: 'agent_engine',
      modelId: 'big-pickle',
      resolutionSource: 'role',
    });
    const modelEntity = store.getEntity('big-pickle');
    expect(modelEntity).toBeDefined();
    expect(modelEntity!.kind).toBe('MODEL');
  });

  it('ingests an archive entry with relationships', () => {
    builder.ingestManifest(dummyManifest());
    builder.ingestArchiveEntry({
      id: 'arch1',
      summary: 'Completed task 1',
      entityIds: ['t1', 't2'],
      timestamp: NOW,
    });

    const entry = store.getEntity('arch1');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('ARCHIVE_ENTRY');

    const rels = store.getRelationships('arch1', 'RELATES_TO');
    expect(rels).toHaveLength(2);
  });

  it('is idempotent for same entities', () => {
    builder.ingestManifest(dummyManifest());
    builder.ingestManifest(dummyManifest());
    const tasks = store.findEntities('TASK');
    expect(tasks).toHaveLength(2);
    expect(store.stats().entities).toBe(7); // project + manifest + milestone + 2 tasks + artifact + constraint
  });
});

describe('MemoryGraph facade', () => {
  it('creates graph with store and builder', () => {
    const graph = new MemoryGraph();
    expect(graph.store).toBeDefined();
    expect(graph.builder).toBeDefined();
    expect(graph.stats()).toEqual({ entities: 0, relationships: 0 });
  });

  it('clear resets everything', () => {
    const graph = new MemoryGraph();
    graph.builder.ingestManifest(dummyManifest());
    expect(graph.stats().entities).toBeGreaterThan(0);
    graph.clear();
    expect(graph.stats()).toEqual({ entities: 0, relationships: 0 });
  });
});

describe('Schema enums', () => {
  it('GraphEntityKindEnum has all expected kinds', () => {
    const kinds = GraphEntityKindEnum.options;
    expect(kinds).toContain('PROJECT');
    expect(kinds).toContain('MANIFEST');
    expect(kinds).toContain('TASK');
    expect(kinds).toContain('AGENT');
    expect(kinds).toContain('ASSIGNMENT');
    expect(kinds).toContain('MODEL');
    expect(kinds).toContain('MILESTONE');
    expect(kinds).toContain('CONSTRAINT');
    expect(kinds).toContain('ARCHIVE_ENTRY');
    expect(kinds).toContain('ARTIFACT');
  });

  it('GraphRelationshipTypeEnum has all expected types', () => {
    const types = GraphRelationshipTypeEnum.options;
    expect(types).toContain('DEPENDS_ON');
    expect(types).toContain('ASSIGNED_TO');
    expect(types).toContain('CONTAINS');
    expect(types).toContain('PRODUCES');
    expect(types).toContain('BLOCKS');
    expect(types).toContain('PRECEDES');
    expect(types).toContain('REVIEWED_BY');
    expect(types).toContain('RELATES_TO');
    expect(types).toContain('USES_MODEL');
    expect(types).toContain('EXECUTED_BY');
    expect(types).toContain('GENERATED_FROM');
    expect(types).toContain('BELONGS_TO');
  });
});

describe('Integration: builder produces queryable graph', () => {
  it('finds all tasks in a manifest via traversal', () => {
    const store = new InMemoryGraphStore();
    const builder = new GraphBuilder(store);
    builder.ingestManifest(dummyManifest());

    const result = store.traverse('m1', { fromId: 'm1', maxDepth: 2, kinds: ['TASK'] });
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toContain('t1');
    expect(result.map(r => r.id)).toContain('t2');
  });

  it('finds a path from manifest to artifact', () => {
    const store = new InMemoryGraphStore();
    const builder = new GraphBuilder(store);
    builder.ingestManifest(dummyManifest());

    const path = store.findPath('m1', 'output_a');
    expect(path.length).toBeGreaterThan(0);
    // m1 -> t1 -> output_a
    expect(path[0].type).toBe('CONTAINS');
    expect(path[1].type).toBe('PRODUCES');
  });

  it('gets relationships for assignment including model', () => {
    const store = new InMemoryGraphStore();
    const builder = new GraphBuilder(store);
    builder.ingestManifest(dummyManifest());
    builder.ingestAgent(dummyAgent());
    builder.ingestAssignment(dummyAssignment());

    const snapshot = store.getSubgraph('a1');
    const types = snapshot.relationships.map(r => r.type);
    expect(types).toContain('BELONGS_TO');
    expect(types).toContain('EXECUTED_BY');
    expect(types).toContain('USES_MODEL');

    const kindSet = new Set(snapshot.entities.map(e => e.kind));
    expect(kindSet.has('ASSIGNMENT')).toBe(true);
    expect(kindSet.has('TASK')).toBe(true);
    expect(kindSet.has('AGENT')).toBe(true);
    expect(kindSet.has('MODEL')).toBe(true);
  });
});
