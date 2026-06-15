import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryGraphStore } from '@apex/memory-graph';
import { SimilarityEngine } from '../similarity-engine.js';
import { LessonsStore } from '../lessons-store.js';
import { ContextRetriever } from '../context-retriever.js';
import { PatternRegistry } from '../pattern-registry.js';
import { PatternMatcher } from '../pattern-matcher.js';
import { KnowledgeBase, DEFAULT_PATTERNS } from '../index.js';
import type { ProjectPattern, Document } from '../types.js';

const NOW = new Date().toISOString();

function ts(): string {
  return new Date().toISOString();
}

// ─── SimilarityEngine ───

describe('SimilarityEngine', () => {
  let engine: SimilarityEngine;

  beforeEach(() => {
    engine = new SimilarityEngine();
  });

  it('starts empty', () => {
    expect(engine.stats.documents).toBe(0);
    expect(engine.stats.terms).toBe(0);
    expect(engine.search('anything')).toEqual([]);
  });

  it('indexes a document and finds it by search', () => {
    engine.indexDocument({ id: 'd1', text: 'React component library with hooks', source: 'manifest' });
    const results = engine.search('react hooks', 5);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('d1');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('ranks relevant documents higher', () => {
    engine.indexDocument({ id: 'd1', text: 'Build a CLI tool for file conversion', source: 'manifest' });
    engine.indexDocument({ id: 'd2', text: 'React dashboard with data visualization', source: 'manifest' });

    const results = engine.search('cli tool file conversion', 5);
    expect(results[0].id).toBe('d1');
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('returns empty for empty index', () => {
    expect(engine.search('anything')).toEqual([]);
  });

  it('removes a document', () => {
    engine.indexDocument({ id: 'd1', text: 'Some text content here', source: 'manifest' });
    expect(engine.stats.documents).toBe(1);
    engine.removeDocument('d1');
    expect(engine.stats.documents).toBe(0);
    expect(engine.search('text')).toEqual([]);
  });

  it('clears all documents', () => {
    engine.indexDocument({ id: 'd1', text: 'First document', source: 'manifest' });
    engine.indexDocument({ id: 'd2', text: 'Second document', source: 'task' });
    engine.clear();
    expect(engine.stats.documents).toBe(0);
    expect(engine.stats.terms).toBe(0);
  });

  it('respects topK parameter', () => {
    for (let i = 0; i < 10; i++) {
      engine.indexDocument({ id: `d${i}`, text: `Document number ${i} about react hooks components`, source: 'manifest' });
    }
    const results = engine.search('react hooks', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('handles multi-token BM25 scoring', () => {
    engine.indexDocument({ id: 'd1', text: 'REST API with Express and MongoDB', source: 'manifest' });
    engine.indexDocument({ id: 'd2', text: 'React frontend with REST API backend', source: 'manifest' });
    engine.indexDocument({ id: 'd3', text: 'CLI tool for data migration', source: 'task' });

    const results = engine.search('REST API backend');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('d2');
  });
});

// ─── LessonsStore ───

describe('LessonsStore', () => {
  let store: LessonsStore;

  beforeEach(() => {
    store = new LessonsStore();
  });

  it('starts empty', () => {
    expect(store.size).toBe(0);
    expect(store.all()).toEqual([]);
  });

  it('adds and retrieves an entry', () => {
    const entry = store.addEntry({
      summary: 'React build failures caused by vite alias mismatch',
      detail: 'When using path aliases in vite.config.ts, ensure tsconfig paths match exactly',
      tags: ['react', 'vite', 'build', 'alias'],
      source: 'manual',
      projectId: 'p1',
      manifestId: 'm1',
    });
    expect(entry.id).toBeDefined();
    expect(entry.createdAt).toBeDefined();

    const retrieved = store.getEntry(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.summary).toBe('React build failures caused by vite alias mismatch');
  });

  it('returns undefined for missing entry', () => {
    expect(store.getEntry('nonexistent')).toBeUndefined();
  });

  it('finds lessons by topic keyword match', () => {
    store.addEntry({ summary: 'React hook dependency arrays matter', detail: '', tags: ['react'], source: 'manual' });
    store.addEntry({ summary: 'Docker networking for microservices', detail: '', tags: ['docker'], source: 'manual' });

    const results = store.getLessons('react hooks');
    expect(results).toHaveLength(1);
    expect(results[0].tags).toContain('react');
  });

  it('finds lessons by tag', () => {
    store.addEntry({ summary: 'Handling JWT expiry gracefully', detail: '', tags: ['auth', 'jwt'], source: 'manual' });
    store.addEntry({ summary: 'State management with Zustand', detail: '', tags: ['react', 'state'], source: 'manual' });

    const results = store.findByTag('auth');
    expect(results).toHaveLength(1);
    expect(results[0].summary).toContain('JWT');
  });

  it('finds lessons by project', () => {
    store.addEntry({ summary: 'Lesson from project A', detail: '', tags: [], source: 'manual', projectId: 'pA' });
    store.addEntry({ summary: 'Lesson from project B', detail: '', tags: [], source: 'manual', projectId: 'pB' });

    expect(store.findByProject('pA')).toHaveLength(1);
    expect(store.findByProject('pC')).toEqual([]);
  });

  it('clears all entries', () => {
    store.addEntry({ summary: 'Something', detail: '', tags: [], source: 'manual' });
    expect(store.size).toBe(1);
    store.clear();
    expect(store.size).toBe(0);
  });
});

// ─── ContextRetriever ───

describe('ContextRetriever', () => {
  let graph: InMemoryGraphStore;
  let retriever: ContextRetriever;

  beforeEach(() => {
    graph = new InMemoryGraphStore();
    retriever = new ContextRetriever(graph);

    graph.addEntity({ id: 'p1', kind: 'PROJECT', properties: { name: 'Test Project' }, createdAt: NOW, updatedAt: NOW });
    graph.addEntity({ id: 'm1', kind: 'MANIFEST', properties: { state: 'READY' }, createdAt: NOW, updatedAt: NOW });
    graph.addRelationship({ id: 'r_c_p', sourceId: 'p1', targetId: 'm1', type: 'CONTAINS', createdAt: NOW });

    graph.addEntity({ id: 'ms1', kind: 'MILESTONE', properties: { title: 'Core Setup' }, createdAt: NOW, updatedAt: NOW });
    graph.addRelationship({ id: 'r_c_ms', sourceId: 'm1', targetId: 'ms1', type: 'CONTAINS', createdAt: NOW });

    graph.addEntity({ id: 't1', kind: 'TASK', properties: { title: 'Implement auth', state: 'BLOCKED' }, createdAt: NOW, updatedAt: NOW });
    graph.addEntity({ id: 't2', kind: 'TASK', properties: { title: 'Implement API', state: 'READY' }, createdAt: NOW, updatedAt: NOW });
    graph.addRelationship({ id: 'r_t1_ms', sourceId: 'ms1', targetId: 't1', type: 'CONTAINS', createdAt: NOW });
    graph.addRelationship({ id: 'r_t2_ms', sourceId: 'ms1', targetId: 't2', type: 'CONTAINS', createdAt: NOW });
    graph.addRelationship({ id: 'r_m1_t1', sourceId: 'm1', targetId: 't1', type: 'CONTAINS', createdAt: NOW });
    graph.addRelationship({ id: 'r_m1_t2', sourceId: 'm1', targetId: 't2', type: 'CONTAINS', createdAt: NOW });

    graph.addRelationship({ id: 'r_dep', sourceId: 't2', targetId: 't1', type: 'DEPENDS_ON', createdAt: NOW });

    graph.addEntity({ id: 'a1', kind: 'ASSIGNMENT', properties: { taskId: 't1', agentId: 'ag1', status: 'ASSIGNED' }, createdAt: NOW, updatedAt: NOW });
    graph.addRelationship({ id: 'r_assign', sourceId: 'a1', targetId: 't1', type: 'BELONGS_TO', createdAt: NOW });

    graph.addEntity({ id: 'ag1', kind: 'AGENT', properties: { name: 'engine' }, createdAt: NOW, updatedAt: NOW });
    graph.addRelationship({ id: 'r_exec', sourceId: 'a1', targetId: 'ag1', type: 'EXECUTED_BY', createdAt: NOW });
  });

  it('returns related context for a task with milestone', () => {
    const ctx = retriever.getRelatedContext('t1');
    expect(ctx.taskId).toBe('t1');
    expect(ctx.milestone).not.toBeNull();
    expect(ctx.milestone!.title).toBe('Core Setup');
  });

  it('returns sibling tasks', () => {
    const ctx = retriever.getRelatedContext('t1');
    expect(ctx.siblings.length).toBeGreaterThan(0);
    expect(ctx.siblings.map(s => s.id)).toContain('t2');
  });

  it('returns assigned agent', () => {
    const ctx = retriever.getRelatedContext('t1');
    expect(ctx.assignedAgent).not.toBeNull();
    expect(ctx.assignedAgent!.name).toBe('engine');
  });

  it('returns blockers for a task with BLOCKED dependency', () => {
    const ctx = retriever.getRelatedContext('t2');
    expect(ctx.blockers.length).toBeGreaterThan(0);
  });

  it('returns empty context for missing task', () => {
    const ctx = retriever.getRelatedContext('nonexistent');
    expect(ctx.milestone).toBeNull();
    expect(ctx.siblings).toEqual([]);
    expect(ctx.assignedAgent).toBeNull();
  });

  it('returns related tasks for a manifest', () => {
    const tasks = retriever.getRelatedTasks('m1');
    expect(tasks).toContain('t1');
    expect(tasks).toContain('t2');
  });

  it('gets assigned agent by assignment id', () => {
    const agent = retriever.getAssignedAgent('a1');
    expect(agent).toBeDefined();
    expect(agent!.properties.name).toBe('engine');
  });
});

// ─── PatternRegistry ───

describe('PatternRegistry', () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = new PatternRegistry();
  });

  const testPattern: ProjectPattern = {
    id: 'test-pattern',
    name: 'Test Pattern',
    triggerKeywords: ['test', 'jest', 'vitest'],
    lessons: ['Use test runner with watch mode'],
    recommendedTasks: ['Write unit tests', 'Set up CI'],
    antiPatterns: ['Do not skip edge cases'],
  };

  it('starts empty', () => {
    expect(registry.size).toBe(0);
  });

  it('registers and retrieves a pattern', () => {
    registry.register(testPattern);
    expect(registry.size).toBe(1);
    const retrieved = registry.get('test-pattern');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Test Pattern');
  });

  it('registerMany adds multiple patterns', () => {
    registry.registerMany([testPattern, { id: 'p2', name: 'Pattern 2', triggerKeywords: ['other'], lessons: [], recommendedTasks: [], antiPatterns: [] }]);
    expect(registry.size).toBe(2);
  });

  it('findMatching returns patterns by keyword match', () => {
    registry.register(testPattern);
    const matches = registry.findMatching('Running jest tests with vitest');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe('test-pattern');
  });

  it('findMatching returns empty when no keywords match', () => {
    registry.register(testPattern);
    const matches = registry.findMatching('unrelated topic about gardening');
    expect(matches).toHaveLength(0);
  });

  it('clear removes all patterns', () => {
    registry.register(testPattern);
    expect(registry.size).toBe(1);
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it('unregister removes specific pattern', () => {
    registry.register(testPattern);
    registry.unregister('test-pattern');
    expect(registry.get('test-pattern')).toBeUndefined();
  });
});

// ─── PatternMatcher ───

describe('PatternMatcher', () => {
  let registry: PatternRegistry;
  let matcher: PatternMatcher;

  const displayPattern: ProjectPattern = {
    id: 'display',
    name: 'Display Layer',
    triggerKeywords: ['react', 'vue', 'component', 'ui'],
    lessons: ['Memoize expensive renders'],
    recommendedTasks: ['Set up component library', 'Add Storybook'],
    antiPatterns: ['Avoid prop drilling'],
  };

  const apiPattern: ProjectPattern = {
    id: 'api',
    name: 'API Layer',
    triggerKeywords: ['api', 'express', 'rest'],
    lessons: ['Use consistent error format'],
    recommendedTasks: ['Add request validation', 'Set up error middleware'],
    antiPatterns: ['Do not expose internals'],
  };

  beforeEach(() => {
    registry = new PatternRegistry();
    registry.registerMany([displayPattern, apiPattern]);
    matcher = new PatternMatcher(registry);
  });

  it('matches patterns by text', () => {
    const matches = matcher.match('Building a React component with UI elements');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe('display');
  });

  it('returns recommended tasks for matched patterns', () => {
    const tasks = matcher.getRecommendedTasks('React component for dashboard');
    expect(tasks).toContain('Set up component library');
  });

  it('returns lessons for matched patterns', () => {
    const lessons = matcher.getLessons('Express REST API server');
    expect(lessons).toContain('Use consistent error format');
  });

  it('returns anti-patterns for matched patterns', () => {
    const anti = matcher.getAntiPatterns('React component for UI');
    expect(anti).toContain('Avoid prop drilling');
  });
});

// ─── KnowledgeBase facade ───

describe('KnowledgeBase', () => {
  let graph: InMemoryGraphStore;
  let kb: KnowledgeBase;

  beforeEach(() => {
    graph = new InMemoryGraphStore();
    kb = new KnowledgeBase(graph);
  });

  it('creates with all subsystems', () => {
    expect(kb.similarityEngine).toBeDefined();
    expect(kb.lessonsStore).toBeDefined();
    expect(kb.contextRetriever).toBeDefined();
    expect(kb.patternRegistry).toBeDefined();
    expect(kb.patternMatcher).toBeDefined();
  });

  it('stats start at zero', () => {
    const stats = kb.getStats();
    expect(stats.documents).toBe(0);
    expect(stats.lessons).toBe(0);
    expect(stats.patterns).toBeGreaterThan(0);
  });

  it('loads default patterns on construction', () => {
    expect(kb.patternRegistry.size).toBe(DEFAULT_PATTERNS.length);
  });

  it('accepts custom patterns on construction', () => {
    const custom = { id: 'custom', name: 'Custom', triggerKeywords: ['custom'], lessons: [], recommendedTasks: [], antiPatterns: [] };
    const kb2 = new KnowledgeBase(graph, [custom]);
    expect(kb2.patternRegistry.size).toBe(DEFAULT_PATTERNS.length + 1);
  });

  it('ingestManifestKnowledge indexes into similarity engine', () => {
    const manifest = {
      manifestId: 'm1',
      projectId: 'p1',
      version: '1.0',
      state: 'READY',
      metadata: { requirement: 'Build a React dashboard', specification: '', architecturePlan: '' },
      milestones: [],
      tasks: [
        { taskId: 't1', title: 'Setup React', description: '', state: 'PENDING', dependsOn: [], outputs: [], priority: 50 },
      ],
      constraints: [],
      reviewRequirements: [],
      createdAt: NOW,
      updatedAt: NOW,
    } as any;

    kb.ingestManifestKnowledge(manifest);
    expect(kb.getStats().documents).toBe(1);
    expect(kb.getStats().lessons).toBeGreaterThan(0);

    const results = kb.search('React dashboard');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('m1');
  });

  it('ingestReviewKnowledge indexes review content', () => {
    kb.ingestReviewKnowledge('rev1', 'Security review passed with minor issues', ['security', 'review'], 'm1');
    expect(kb.getStats().documents).toBe(1);
    expect(kb.getStats().lessons).toBe(1);
  });

  it('satisfies KnowledgeProvider interface', () => {
    const provider: import('../providers.js').KnowledgeProvider = kb;
    expect(provider.search).toBeDefined();
    expect(provider.getLessons).toBeDefined();
  });

  it('getContextForPlanning combines context and similarity', () => {
    graph.addEntity({ id: 't1', kind: 'TASK', properties: { title: 'Test task', state: 'PENDING' }, createdAt: NOW, updatedAt: NOW });
    graph.addEntity({ id: 'm1', kind: 'MANIFEST', properties: {}, createdAt: NOW, updatedAt: NOW });
    graph.addRelationship({ id: 'r1', sourceId: 'm1', targetId: 't1', type: 'CONTAINS', createdAt: NOW });

    const result = kb.getContextForPlanning('t1');
    expect(result.related).toBeDefined();
    expect(result.related.taskId).toBe('t1');
    expect(result.similar).toBeDefined();
  });
});

// ─── Integration: DEFAULT_PATTERNS export ───

describe('DEFAULT_PATTERNS', () => {
  it('includes the fallback pattern', () => {
    expect(DEFAULT_PATTERNS.find(p => p.id === 'default')).toBeDefined();
  });

  it('includes all expected patterns', () => {
    const ids = DEFAULT_PATTERNS.map(p => p.id).sort();
    expect(ids).toEqual(['cli-tool', 'default', 'rag-system', 'react-spa', 'rest-api']);
  });

  it('each pattern has required fields', () => {
    for (const p of DEFAULT_PATTERNS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(Array.isArray(p.triggerKeywords)).toBe(true);
      expect(Array.isArray(p.lessons)).toBe(true);
      expect(Array.isArray(p.recommendedTasks)).toBe(true);
      expect(Array.isArray(p.antiPatterns)).toBe(true);
    }
  });
});
