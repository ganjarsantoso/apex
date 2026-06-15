import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeNormalizer } from '../knowledge-normalizer.js';
import { DuplicateDetector } from '../duplicate-detector.js';
import { KnowledgeClusterer } from '../knowledge-clusterer.js';
import { ConsolidatedStore } from '../consolidated-store.js';
import { KnowledgeConsolidator } from '../knowledge-consolidator.js';
import type { KnowledgeEntry } from '../types.js';

function makeEntry(id: string, summary: string, source: KnowledgeEntry['source'] = 'retrospective', extra?: Partial<KnowledgeEntry>): KnowledgeEntry {
  return {
    id,
    summary,
    detail: summary,
    tags: extra?.tags ?? ['test'],
    source,
    projectId: extra?.projectId,
    manifestId: extra?.manifestId,
    createdAt: new Date().toISOString(),
  };
}

// ─── KnowledgeNormalizer ─────────────────────────────────────

describe('KnowledgeNormalizer', () => {
  let normalizer: KnowledgeNormalizer;

  beforeEach(() => {
    normalizer = new KnowledgeNormalizer();
  });

  it('replaces synonyms with canonical form', () => {
    const result = normalizer.normalize('compile error in auth module');
    expect(result).toContain('build');
    expect(result).toContain('fail');
    expect(result).toContain('auth');
  });

  it('sorts words alphabetically', () => {
    const a = normalizer.normalize('build failed because config');
    const b = normalizer.normalize('config failed build');
    expect(a).toBe(b);
  });

  it('removes stop words', () => {
    const result = normalizer.normalize('the build error was in the config module');
    expect(result).not.toContain('the');
    expect(result).not.toContain('was');
    expect(result).toContain('build');
    expect(result).toContain('fail');
    expect(result).toContain('config');
  });

  it('deduplicates tokens', () => {
    const result = normalizer.normalize('build build error error');
    expect(result.split(' ').filter(w => w === 'build').length).toBe(1);
  });

  it('allows adding custom synonyms', () => {
    normalizer.addSynonym('deploy', ['rollout']);
    const result = normalizer.normalize('rollout failed');
    expect(result).toContain('deploy');
    expect(result).toContain('fail');
  });

  it('supports extend with multiple synonyms', () => {
    normalizer.extend({ monitor: ['observability', 'telemetry'] });
    const result = normalizer.normalize('observability telemetry setup');
    expect(result).toContain('monitor');
    expect(result).not.toContain('observability');
    expect(result).not.toContain('telemetry');
  });

  it('removes punctuation', () => {
    const result = normalizer.normalize('build failed! (config error)');
    expect(result).not.toContain('!');
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
  });

  it('returns empty string for empty input', () => {
    expect(normalizer.normalize('')).toBe('');
  });
});

// ─── DuplicateDetector ───────────────────────────────────────

describe('DuplicateDetector', () => {
  let normalizer: KnowledgeNormalizer;
  let detector: DuplicateDetector;

  beforeEach(() => {
    normalizer = new KnowledgeNormalizer();
    detector = new DuplicateDetector(normalizer);
  });

  it('detects exact duplicates', () => {
    const entries = [
      makeEntry('a', 'build failed due to config error'),
      makeEntry('b', 'build failed due to config error'),
    ];
    const results = detector.detect(entries);
    expect(results).toHaveLength(1);
    expect(results[0].method).toBe('keyword');
    expect(results[0].similarity).toBe(1);
  });

  it('detects near duplicates with synonyms', () => {
    const entries = [
      makeEntry('a', 'compile error in configuration'),
      makeEntry('b', 'build failure in config'),
    ];
    const results = detector.detect(entries);
    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.7);
  });

  it('does not flag different lessons', () => {
    const entries = [
      makeEntry('a', 'redis cache connection timeout'),
      makeEntry('b', 'jwt token expired for user'),
    ];
    const results = detector.detect(entries);
    expect(results).toHaveLength(0);
  });

  it('respects custom threshold', () => {
    const entries = [
      makeEntry('a', 'build error in api'),
      makeEntry('b', 'redis cache timeout error'),
    ];
    const results = detector.detect(entries, 0.9);
    expect(results).toHaveLength(0);
  });

  it('returns empty for single entry', () => {
    const results = detector.detect([makeEntry('a', 'build error')]);
    expect(results).toHaveLength(0);
  });

  it('returns empty for empty array', () => {
    const results = detector.detect([]);
    expect(results).toHaveLength(0);
  });

  it('identifies cross-project duplicates', () => {
    const entries = [
      makeEntry('a', 'build failed alias mismatch', 'retrospective', { projectId: 'proj-a' }),
      makeEntry('b', 'build failure alias mismatch', 'retrospective', { projectId: 'proj-b' }),
    ];
    const results = detector.detect(entries);
    expect(results).toHaveLength(1);
  });

  it('keeps the longer text variant', () => {
    const entries = [
      makeEntry('a', 'build error'),
      makeEntry('b', 'build failure config issue deployment'),
    ];
    const results = detector.detect(entries);
    expect(results).toHaveLength(1);
    expect(results[0].keptId).toBe('b');
  });
});

// ─── KnowledgeClusterer ──────────────────────────────────────

describe('KnowledgeClusterer', () => {
  let clusterer: KnowledgeClusterer;

  beforeEach(() => {
    clusterer = new KnowledgeClusterer();
  });

  it('creates a single cluster from duplicate pair', () => {
    const entries = [
      makeEntry('a', 'build error'),
      makeEntry('b', 'build failure'),
    ];
    const dups = [{ keptId: 'a', mergedId: 'b', similarity: 1, method: 'keyword' as const }];
    const clusters = clusterer.cluster(entries, dups);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].size).toBe(2);
  });

  it('merges transitive duplicates into one cluster', () => {
    const entries = [
      makeEntry('a', 'build error'),
      makeEntry('b', 'build failure'),
      makeEntry('c', 'build issue'),
    ];
    const dups = [
      { keptId: 'a', mergedId: 'b', similarity: 1, method: 'keyword' as const },
      { keptId: 'b', mergedId: 'c', similarity: 0.9, method: 'keyword' as const },
    ];
    const clusters = clusterer.cluster(entries, dups);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].size).toBe(3);
  });

  it('creates multiple clusters for separate groups', () => {
    const entries = [
      makeEntry('a', 'build error'),
      makeEntry('b', 'build failure'),
      makeEntry('c', 'redis timeout'),
      makeEntry('d', 'cache connection timeout'),
    ];
    const dups = [
      { keptId: 'a', mergedId: 'b', similarity: 1, method: 'keyword' as const },
      { keptId: 'c', mergedId: 'd', similarity: 0.8, method: 'keyword' as const },
    ];
    const clusters = clusterer.cluster(entries, dups);
    expect(clusters).toHaveLength(2);
  });

  it('respects minClusterSize', () => {
    const entries = [
      makeEntry('a', 'build error'),
      makeEntry('b', 'build failure'),
    ];
    const dups = [{ keptId: 'a', mergedId: 'b', similarity: 1, method: 'keyword' as const }];
    const clusters = clusterer.cluster(entries, dups, 3);
    expect(clusters).toHaveLength(0);
  });

  it('returns empty for no duplicate pairs', () => {
    const entries = [makeEntry('a', 'build error'), makeEntry('b', 'deploy success')];
    const clusters = clusterer.cluster(entries, []);
    expect(clusters).toHaveLength(0);
  });
});

// ─── ConsolidatedStore ───────────────────────────────────────

describe('ConsolidatedStore', () => {
  let store: ConsolidatedStore;

  beforeEach(() => {
    store = new ConsolidatedStore();
  });

  it('adds and retrieves an entry', () => {
    const entry = store.add({
      canonicalText: 'build error in config',
      sources: [{ id: 'a', type: 'lesson' }],
      projectIds: ['proj-1'],
      manifestIds: ['m-1'],
      tags: ['build', 'config'],
      frequency: 1,
    });
    const retrieved = store.get(entry.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.canonicalText).toBe('build error in config');
  });

  it('finds entries by project', () => {
    store.add({
      canonicalText: 'a',
      sources: [],
      projectIds: ['p1'],
      manifestIds: [],
      tags: [],
      frequency: 1,
    });
    store.add({
      canonicalText: 'b',
      sources: [],
      projectIds: ['p2'],
      manifestIds: [],
      tags: [],
      frequency: 1,
    });
    expect(store.findByProject('p1')).toHaveLength(1);
    expect(store.findByProject('p3')).toHaveLength(0);
  });

  it('finds entries by tag', () => {
    store.add({
      canonicalText: 'a',
      sources: [],
      projectIds: [],
      manifestIds: [],
      tags: ['auth', 'api'],
      frequency: 1,
    });
    store.add({
      canonicalText: 'b',
      sources: [],
      projectIds: [],
      manifestIds: [],
      tags: ['cache'],
      frequency: 1,
    });
    expect(store.findByTag('auth')).toHaveLength(1);
    expect(store.findByTag('cache')).toHaveLength(1);
  });

  it('removes an entry', () => {
    const entry = store.add({ canonicalText: 'x', sources: [], projectIds: [], manifestIds: [], tags: [], frequency: 1 });
    expect(store.size).toBe(1);
    store.remove(entry.id);
    expect(store.size).toBe(0);
  });

  it('clears all entries', () => {
    store.add({ canonicalText: 'a', sources: [], projectIds: [], manifestIds: [], tags: [], frequency: 1 });
    store.add({ canonicalText: 'b', sources: [], projectIds: [], manifestIds: [], tags: [], frequency: 1 });
    expect(store.size).toBe(2);
    store.clear();
    expect(store.size).toBe(0);
  });

  it('reports stats', () => {
    store.add({ canonicalText: 'a', sources: [], projectIds: [], manifestIds: [], tags: [], frequency: 1, clusterId: 'c1' });
    store.add({ canonicalText: 'b', sources: [], projectIds: [], manifestIds: [], tags: [], frequency: 1, clusterId: 'c1' });
    const stats = store.getStats();
    expect(stats.consolidated).toBe(2);
    expect(stats.clusters).toBe(1);
  });
});

// ─── KnowledgeConsolidator ───────────────────────────────────

describe('KnowledgeConsolidator', () => {
  let consolidator: KnowledgeConsolidator;

  beforeEach(() => {
    consolidator = new KnowledgeConsolidator({ enabled: true, keywordThreshold: 0.7 });
  });

  it('consolidates duplicate entries', async () => {
    const entries = [
      makeEntry('a', 'build failed due to config error', 'retrospective', { projectId: 'p1' }),
      makeEntry('b', 'compile error in configuration setup', 'retrospective', { projectId: 'p2' }),
      makeEntry('c', 'deploy succeeded no issues', 'retrospective', { projectId: 'p1' }),
    ];
    const report = await consolidator.consolidate(entries);
    expect(report.totalEntries).toBe(3);
    expect(report.duplicatesFound).toBeGreaterThanOrEqual(1);
    expect(report.clustersCreated).toBeGreaterThanOrEqual(1);
    expect(report.consolidatedCreated).toBe(2); // one cluster + one singleton
    expect(report.methods).toContain('keyword');
  });

  it('handles empty input', async () => {
    const report = await consolidator.consolidate([]);
    expect(report.totalEntries).toBe(0);
    expect(report.duplicatesFound).toBe(0);
  });

  it('handles entries with no duplicates', async () => {
    const entries = [
      makeEntry('a', 'redis cache connection timeout', 'retrospective'),
      makeEntry('b', 'jwt token expired for admin user', 'retrospective'),
    ];
    const report = await consolidator.consolidate(entries);
    expect(report.duplicatesFound).toBe(0);
    expect(report.consolidatedCreated).toBe(2);
  });

  it('creates consolidated entries with typed sources', async () => {
    const entries = [
      makeEntry('a', 'build error in config', 'retrospective'),
      makeEntry('b', 'build failure in config', 'retrospective'),
    ];
    await consolidator.consolidate(entries);
    const all = consolidator.store.all();
    const merged = all.find(e => e.sources.length > 1);
    expect(merged).toBeDefined();
    expect(merged!.sources).toContainEqual({ id: 'a', type: 'retrospective' });
    expect(merged!.sources).toContainEqual({ id: 'b', type: 'retrospective' });
  });

  it('maps source type correctly', async () => {
    const entries = [
      makeEntry('a', 'search issue', 'manual'),
      makeEntry('b', 'search failure', 'review'),
      makeEntry('c', 'auth issue', 'pattern', { tags: ['auth'] }),
      makeEntry('d', 'auth error', 'retrospective', { tags: ['auth'] }),
    ];
    const report = await consolidator.consolidate(entries);
    expect(report.consolidatedCreated).toBeGreaterThanOrEqual(2);

    const patternsOrManuals = consolidator.store.all().filter(e =>
      e.sources.some(s => s.type === 'lesson' && s.id === 'a'),
    );
    expect(patternsOrManuals.length).toBeGreaterThanOrEqual(1);
  });

  it('findSimilar returns matching consolidated entry', async () => {
    const entries = [
      makeEntry('a', 'build error config'),
      makeEntry('b', 'build failure config'),
    ];
    await consolidator.consolidate(entries);

    const newEntry = makeEntry('c', 'build config error');
    const result = consolidator.findSimilar(newEntry, entries);
    expect(result).not.toBeNull();
    expect(result!.sources.some(s => s.id === 'a' || s.id === 'b')).toBe(true);
  });

  it('findSimilar returns null for unique entry', () => {
    const entries = [makeEntry('a', 'build error')];
    const newEntry = makeEntry('b', 'redis cache timeout');
    const result = consolidator.findSimilar(newEntry, entries);
    expect(result).toBeNull();
  });
});

// ─── KnowledgeBase Integration ───────────────────────────────

import { InMemoryGraphStore } from '@apex/memory-graph';
import { KnowledgeBase } from '../index.js';

describe('KnowledgeBase integration with consolidation', () => {
  let graphStore: InMemoryGraphStore;
  let kb: KnowledgeBase;

  beforeEach(() => {
    graphStore = new InMemoryGraphStore();
  });

  it('does not create consolidator when disabled', () => {
    kb = new KnowledgeBase(graphStore);
    expect((kb as any).consolidator).toBeUndefined();
  });

  it('creates consolidator when enabled', () => {
    kb = new KnowledgeBase(graphStore, undefined, {
      consolidationConfig: { enabled: true, keywordThreshold: 0.7 },
    });
    expect((kb as any).consolidator).toBeDefined();
  });

  it('runConsolidation returns report when consolidator exists', async () => {
    kb = new KnowledgeBase(graphStore, undefined, {
      consolidationConfig: { enabled: true },
    });
    const report = await kb.runConsolidation();
    expect(report.totalEntries).toBe(0);
    expect(report.methods).toEqual([]);
  });

  it('runConsolidation returns empty report when consolidator absent', async () => {
    kb = new KnowledgeBase(graphStore);
    const report = await kb.runConsolidation();
    expect(report.totalEntries).toBe(0);
    expect(report.consolidatedCreated).toBe(0);
  });

  it('getConsolidatedLessons returns empty when consolidator absent', () => {
    kb = new KnowledgeBase(graphStore);
    expect(kb.getConsolidatedLessons('test')).toEqual([]);
  });

  it('getConsolidationStats returns zeros when consolidator absent', () => {
    kb = new KnowledgeBase(graphStore);
    const stats = kb.getConsolidationStats();
    expect(stats.entries).toBe(0);
    expect(stats.consolidated).toBe(0);
  });
});
