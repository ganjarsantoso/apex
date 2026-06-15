import { describe, it, expect } from 'vitest';
import { ManifestStore, getMemoryConnection as getManifestMemory, runMigrations as runManifestMigrations } from '@apex/manifest';
import { InMemoryGraphStore } from '@apex/memory-graph';
import { RetrospectiveTemplate } from '../retrospective-template.js';
import { RetrospectiveGenerator } from '../retrospective-generator.js';
import { LessonExtractor } from '../lesson-extractor.js';
import { LessonConsolidator } from '../lesson-consolidator.js';
import { LessonScorer } from '../lesson-scorer.js';
import type { RetrospectiveEvents, LessonSummary } from '../types.js';

function makeManifest(overrides?: Record<string, unknown>) {
  const now = new Date().toISOString();
  return {
    manifestId: 'retro_manifest_001',
    projectId: 'retro_project_001',
    version: '1.0',
    state: 'COMPLETE' as const,
    metadata: { requirement: 'Build a CLI tool', specification: '', architecturePlan: '' },
    milestones: [{ id: 'm1', title: 'MVP', description: '', taskIds: ['t1', 't2'] }],
    tasks: [
      { taskId: 't1', title: 'Implement login', description: '', state: 'COMPLETE' as const, dependsOn: [], outputs: ['login.ts'], priority: 50 },
      { taskId: 't2', title: 'Add auth', description: '', state: 'COMPLETE' as const, dependsOn: ['t1'], outputs: ['auth.ts'], priority: 40 },
      { taskId: 't3', title: 'Write tests', description: '', state: 'FAILED' as const, dependsOn: [], outputs: [], priority: 30 },
    ],
    constraints: [],
    reviewRequirements: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeEvents(overrides?: Partial<RetrospectiveEvents>): RetrospectiveEvents {
  return {
    taskFailed: [{ taskId: 't3', reason: 'timeout', version: '1.0', eventId: 'e1', correlationId: 'c1', timestamp: '', source: 'test' }],
    reviewFailed: [{ milestone: 'security', issues: 3, version: '1.0', eventId: 'e2', correlationId: 'c1', timestamp: '', source: 'test' }],
    reviewPassed: [{ milestone: 'code', version: '1.0', eventId: 'e3', correlationId: 'c1', timestamp: '', source: 'test' }],
    securityIssues: [{ issue: 'hardcoded API key', severity: 'CRITICAL', version: '1.0', eventId: 'e4', correlationId: 'c1', timestamp: '', source: 'test' }],
    policyViolations: [{ agentId: 'a1', operation: 'rm -rf /', policy: 'runtime-guard', version: '1.0', eventId: 'e5', correlationId: 'c1', timestamp: '', source: 'test' }],
    phaseTransitions: [{ projectId: 'p1', phaseId: 'ph1', from: 'EXECUTING', to: 'ROLLBACK', trigger: 'failure', version: '1.0', eventId: 'e6', correlationId: 'c1', timestamp: '', source: 'test' }],
    ...overrides,
  };
}

/* ───────── RetrospectiveTemplate ───────── */

describe('RetrospectiveTemplate', () => {
  const template = new RetrospectiveTemplate();

  it('builds wentWell from completed tasks', () => {
    const result = template.build({ manifest: makeManifest(), events: makeEvents() });
    expect(result.wentWell.length).toBeGreaterThan(0);
    expect(result.wentWell.some(l => l.includes('Completed 2 task(s)'))).toBe(true);
  });

  it('builds failed from failed tasks and events', () => {
    const result = template.build({ manifest: makeManifest(), events: makeEvents() });
    expect(result.failed.length).toBeGreaterThan(0);
    expect(result.failed.some(l => l.includes('"Write tests"'))).toBe(true);
    expect(result.failed.some(l => l.includes('security'))).toBe(true);
    expect(result.failed.some(l => l.includes('hardcoded API key'))).toBe(true);
  });

  it('builds avoid from rollback events', () => {
    const result = template.build({ manifest: makeManifest(), events: makeEvents() });
    expect(result.avoid.some(l => l.toLowerCase().includes('rollback'))).toBe(true);
  });

  it('builds recommendations with mixed outcomes', () => {
    const result = template.build({ manifest: makeManifest(), events: makeEvents() });
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('handles manifest with no tasks gracefully', () => {
    const empty = makeManifest({ tasks: [] });
    const result = template.build({ manifest: empty, events: makeEvents({ taskFailed: [], reviewFailed: [], reviewPassed: [], securityIssues: [], policyViolations: [], phaseTransitions: [] }) });
    expect(result.wentWell).toContain('No tasks were completed');
    expect(result.failed).toHaveLength(0);
    expect(result.recommendations).toContain('Continue with current development practices');
  });
});

/* ───────── LessonExtractor ───────── */

describe('LessonExtractor', () => {
  const extractor = new LessonExtractor();
  const tmpl = new RetrospectiveTemplate();

  it('extracts lessons from all retrospective categories', () => {
    const retro = tmpl.build({ manifest: makeManifest(), events: makeEvents() });
    const lessons = extractor.extract(retro);
    expect(lessons.length).toBeGreaterThan(0);

    const categories = new Set(lessons.map(l => l.category));
    expect(categories.has('wentWell')).toBe(true);
    expect(categories.has('failed')).toBe(true);
    expect(categories.has('repeat')).toBe(true);
    expect(categories.has('avoid')).toBe(true);
    expect(categories.has('recommendation')).toBe(true);
  });

  it('infers impact flags from text', () => {
    const retro = tmpl.build({ manifest: makeManifest(), events: makeEvents() });
    const lessons = extractor.extract(retro);
    const avoidLessons = lessons.filter(l => l.category === 'avoid');
    const hasRollbackFlag = avoidLessons.some(l => l.impactFlags.includes('rollback'));
    expect(hasRollbackFlag).toBe(true);
  });

  it('returns empty array for empty retrospective', () => {
    const emptyRetro = {
      manifestId: 'empty', projectId: 'p', wentWell: [], failed: [], repeat: [],
      avoid: [], recommendations: [], confidence: 0.1,
    };
    const lessons = extractor.extract(emptyRetro);
    expect(lessons).toHaveLength(0);
  });

  it('propagates confidence from retrospective to lessons', () => {
    const retro = tmpl.build({ manifest: makeManifest(), events: makeEvents() });
    const lessons = extractor.extract(retro);
    for (const lesson of lessons) {
      expect(lesson.confidence).toBeGreaterThan(0);
    }
  });
});

/* ───────── LessonConsolidator ───────── */

describe('LessonConsolidator', () => {
  const extractor = new LessonExtractor();
  const consolidator = new LessonConsolidator();

  function makeLesson(text: string, overrides?: Partial<LessonSummary>): LessonSummary {
    return {
      id: 'id_' + Math.random().toString(36).slice(2),
      text,
      category: 'failed',
      impactFlags: [],
      sourceManifestId: 'm1',
      frequency: 1,
      confidence: 0.5,
      score: 0,
      normalized: text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(),
      ...overrides,
    };
  }

  it('merges exact duplicate lessons', () => {
    const lessons = [
      makeLesson('Add tests before merge'),
      makeLesson('Add tests before merge'),
    ];
    const result = consolidator.consolidate(lessons);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe(2);
  });

  it('merges near-duplicate lessons with different wording', () => {
    const lessons = [
      makeLesson('Add tests before deploy'),
      makeLesson('Add tests before deploying'),
      makeLesson('Adding tests before deploying'),
    ];
    const result = consolidator.consolidate(lessons);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe(3);
  });

  it('keeps different lessons separate', () => {
    const lessons = [
      makeLesson('Add tests before merge'),
      makeLesson('Fix database migration'),
    ];
    const result = consolidator.consolidate(lessons);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(consolidator.consolidate([])).toHaveLength(0);
  });

  it('returns single lesson unchanged', () => {
    const lessons = [makeLesson('Single lesson')];
    const result = consolidator.consolidate(lessons);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Single lesson');
  });

  it('merges lessons with same word set regardless of ordering', () => {
    const lessons = [
      makeLesson('Add tests before deploying'),
      makeLesson('Deploying before tests add'),
    ];
    const result = consolidator.consolidate(lessons);
    expect(result).toHaveLength(1);
    expect(result[0].frequency).toBe(2);
  });
});

/* ───────── LessonScorer ───────── */

describe('LessonScorer', () => {
  const scorer = new LessonScorer();

  function makeLesson(text: string, overrides?: Partial<LessonSummary>): LessonSummary {
    return {
      id: 'id',
      text,
      category: 'failed',
      impactFlags: [],
      sourceManifestId: 'm1',
      frequency: 1,
      confidence: 0.5,
      score: 0,
      normalized: '',
      ...overrides,
    };
  }

  it('scores by frequency', () => {
    const highFreq = makeLesson('lesson', { frequency: 50 });
    const lowFreq = makeLesson('lesson', { frequency: 1 });
    const [high] = scorer.score([highFreq]);
    const [low] = scorer.score([lowFreq]);
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('scores by impact flags', () => {
    const withRollback = makeLesson('lesson', { impactFlags: ['rollback'] });
    const noFlags = makeLesson('lesson', { impactFlags: [] });
    const [rb] = scorer.score([withRollback]);
    const [nf] = scorer.score([noFlags]);
    expect(rb.score).toBeGreaterThan(nf.score);
  });

  it('scores by specificity (text length)', () => {
    const specific = makeLesson('Add comprehensive database migration validation before deploying to production environment');
    const vague = makeLesson('Test more');
    const [s] = scorer.score([specific]);
    const [v] = scorer.score([vague]);
    expect(s.score).toBeGreaterThan(v.score);
  });

  it('combines all weights correctly', () => {
    const lesson = makeLesson(
      'Add comprehensive database migration validation before deploying to production',
      { frequency: 50, impactFlags: ['rollback', 'security_issue'] },
    );
    const [scored] = scorer.score([lesson]);
    // frequency=40 + impact=40(rollback+security capped at 40) + specificity=15 (78 chars) = 95
    expect(scored.score).toBe(95);
  });

  it('caps score at 100', () => {
    const lesson = makeLesson(
      'A'.repeat(100),
      { frequency: 100, impactFlags: ['rollback', 'security_issue', 'review_failure', 'dependency_failure'] },
    );
    const [scored] = scorer.score([lesson]);
    expect(scored.score).toBeLessThanOrEqual(100);
  });

  it('returns score 0 for empty text with no frequency or flags', () => {
    const lesson = makeLesson('', { frequency: 1, impactFlags: [] });
    const [scored] = scorer.score([lesson]);
    expect(scored.score).toBe(0); // empty text → specificity weight 0
  });
});

/* ───────── RetrospectiveGenerator ───────── */

describe('RetrospectiveGenerator', () => {
  it('generates retrospective for a valid manifest', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    const manifest = makeManifest();
    store.save(manifest);
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    const result = generator.generate({ manifestId: 'retro_manifest_001', events: makeEvents() });
    expect(result).not.toBeNull();
    expect(result!.manifestId).toBe('retro_manifest_001');
    expect(result!.projectId).toBe('retro_project_001');
    expect(result!.wentWell.length).toBeGreaterThan(0);
    expect(result!.failed.length).toBeGreaterThan(0);
  });

  it('returns null for missing manifest', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    const result = generator.generate({ manifestId: 'nonexistent', events: makeEvents() });
    expect(result).toBeNull();
  });

  it('handles empty events gracefully', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    const manifest = makeManifest({ tasks: [] });
    store.save(manifest);
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    const result = generator.generate({
      manifestId: 'retro_manifest_001',
      events: { taskFailed: [], reviewFailed: [], reviewPassed: [], securityIssues: [], policyViolations: [], phaseTransitions: [] },
    });
    expect(result).not.toBeNull();
    expect(result!.wentWell).toContain('No tasks were completed');
  });

  it('detects rollback from phase transition events', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    store.save(makeManifest());
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    const result = generator.generate({ manifestId: 'retro_manifest_001', events: makeEvents() });
    expect(result!.avoid.some(l => l.toLowerCase().includes('rollback'))).toBe(true);
  });

  it('populates all retrospective sections', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    store.save(makeManifest());
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    const result = generator.generate({ manifestId: 'retro_manifest_001', events: makeEvents() });
    expect(result!.wentWell.length).toBeGreaterThan(0);
    expect(result!.failed.length).toBeGreaterThan(0);
    expect(result!.repeat.length).toBeGreaterThan(0);
    expect(result!.avoid.length).toBeGreaterThan(0);
    expect(result!.recommendations.length).toBeGreaterThan(0);
  });
});

/* ───────── Integration ───────── */

describe('Full Pipeline Integration', () => {
  it('produces scored lessons from manifest + events', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    store.save(makeManifest());
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);
    const extractor = new LessonExtractor();
    const consolidator = new LessonConsolidator();
    const scorer = new LessonScorer();

    const retro = generator.generate({ manifestId: 'retro_manifest_001', events: makeEvents() });
    expect(retro).not.toBeNull();

    const lessons = extractor.extract(retro!);
    expect(lessons.length).toBeGreaterThan(0);

    const consolidated = consolidator.consolidate(lessons);
    expect(consolidated.length).toBeLessThanOrEqual(lessons.length);

    const scored = scorer.score(consolidated);
    for (const lesson of scored) {
      expect(lesson.score).toBeGreaterThanOrEqual(0);
      expect(lesson.score).toBeLessThanOrEqual(100);
    }
  });

  it('handles ScheduleCompleted-style data', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    // simulate a manifest with all tasks complete
    const manifest = makeManifest({
      tasks: [
        { taskId: 't1', title: 'Setup project', description: '', state: 'COMPLETE' as const, dependsOn: [], outputs: [], priority: 50 },
        { taskId: 't2', title: 'Build feature', description: '', state: 'COMPLETE' as const, dependsOn: [], outputs: [], priority: 40 },
      ],
    });
    store.save(manifest);
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    // ScheduleCompleted has completedTasks/failedTasks but no detailed failure events
    const result = generator.generate({
      manifestId: 'retro_manifest_001',
      events: { taskFailed: [], reviewFailed: [], reviewPassed: [{ milestone: 'code', version: '1.0', eventId: 'e1', correlationId: 'c1', timestamp: '', source: 'test' }], securityIssues: [], policyViolations: [], phaseTransitions: [] },
    });
    expect(result).not.toBeNull();
    expect(result!.failed).toHaveLength(0);
    expect(result!.wentWell.length).toBeGreaterThan(0);
  });

  it('handles ROLLBACK-style data with failures', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    const manifest = makeManifest({
      tasks: [
        { taskId: 't1', title: 'Deploy', description: '', state: 'FAILED' as const, dependsOn: [], outputs: [], priority: 50 },
      ],
    });
    store.save(manifest);
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    const result = generator.generate({
      manifestId: 'retro_manifest_001',
      events: {
        taskFailed: [{ taskId: 't1', reason: 'deploy script error', version: '1.0', eventId: 'e1', correlationId: 'c1', timestamp: '', source: 'test' }],
        reviewFailed: [],
        reviewPassed: [],
        securityIssues: [],
        policyViolations: [],
        phaseTransitions: [{ projectId: 'p1', phaseId: 'ph1', from: 'EXECUTING', to: 'ROLLBACK', trigger: 'deploy_failure', version: '1.0', eventId: 'e2', correlationId: 'c1', timestamp: '', source: 'test' }],
      },
    });
    expect(result).not.toBeNull();
    expect(result!.failed.some(l => l.includes('Deploy'))).toBe(true);
    expect(result!.avoid.some(l => l.toLowerCase().includes('rollback'))).toBe(true);
  });

  it('confidence propagates through the full pipeline', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    store.save(makeManifest());
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);
    const extractor = new LessonExtractor();
    const consolidator = new LessonConsolidator();
    const scorer = new LessonScorer();

    const retro = generator.generate({ manifestId: 'retro_manifest_001', events: makeEvents() });
    const lessons = extractor.extract(retro!);
    const consolidated = consolidator.consolidate(lessons);
    const scored = scorer.score(consolidated);

    for (const lesson of scored) {
      expect(typeof lesson.confidence).toBe('number');
      expect(lesson.confidence).toBeGreaterThanOrEqual(0);
      expect(lesson.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('handles generator with empty event arrays', () => {
    const db = getManifestMemory();
    runManifestMigrations(db);
    const store = new ManifestStore(db);
    const allOk = makeManifest({
      tasks: [
        { taskId: 't1', title: 'Setup', description: '', state: 'COMPLETE' as const, dependsOn: [], outputs: [], priority: 50 },
      ],
    });
    store.save(allOk);
    const graph = new InMemoryGraphStore();
    const generator = new RetrospectiveGenerator(store, graph);

    const result = generator.generate({
      manifestId: 'retro_manifest_001',
      events: { taskFailed: [], reviewFailed: [], reviewPassed: [], securityIssues: [], policyViolations: [], phaseTransitions: [] },
    });
    expect(result).not.toBeNull();
    expect(result!.failed).toHaveLength(0);
  });
});

/* ───────── Edge Cases ───────── */

describe('Edge Cases', () => {
  it('lesson extractor handles all-empty retrospective', () => {
    const extractor = new LessonExtractor();
    const retro = { manifestId: 'm1', projectId: 'p1', wentWell: [], failed: [], repeat: [], avoid: [], recommendations: [], confidence: 0.1 };
    const lessons = extractor.extract(retro);
    expect(lessons).toHaveLength(0);
  });

  it('consolidator handles single item', () => {
    const consolidator = new LessonConsolidator();
    const lesson: LessonSummary = {
      id: '1', text: 'Unique lesson', category: 'failed', impactFlags: [],
      sourceManifestId: 'm1', frequency: 1, confidence: 0.5, score: 0, normalized: 'unique lesson',
    };
    const result = consolidator.consolidate([lesson]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Unique lesson');
  });

  it('scorer applies frequency weight correctly', () => {
    const scorer = new LessonScorer();
    const lesson: LessonSummary = {
      id: '1', text: 'test', category: 'failed', impactFlags: [],
      sourceManifestId: 'm1', frequency: 50, confidence: 1.0, score: 0, normalized: '',
    };
    const [scored] = scorer.score([lesson]);
    expect(scored.score).toBeGreaterThanOrEqual(40);
  });

  it('scorer applies impact weight correctly', () => {
    const scorer = new LessonScorer();
    const lesson: LessonSummary = {
      id: '1', text: 'test', category: 'failed', impactFlags: ['rollback'],
      sourceManifestId: 'm1', frequency: 1, confidence: 0.5, score: 0, normalized: '',
    };
    const [scored] = scorer.score([lesson]);
    expect(scored.score).toBeGreaterThanOrEqual(40);
  });

  it('scorer caps impact weight at 40', () => {
    const scorer = new LessonScorer();
    const lesson: LessonSummary = {
      id: '1', text: 'test', category: 'failed', impactFlags: ['rollback', 'security_issue', 'review_failure', 'dependency_failure'],
      sourceManifestId: 'm1', frequency: 1, confidence: 0.5, score: 0, normalized: '',
    };
    const [scored] = scorer.score([lesson]);
    // rollback=40 + security_issue=30 would be 70, but capped at 40
    expect(scored.score).toBe(40 + 5); // 40 impact (capped) + 5 specificity (len 4)
  });
});
