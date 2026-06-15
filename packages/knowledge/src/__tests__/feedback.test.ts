import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeRatingStore } from '../knowledge-rating-store.js';
import { LessonRanker } from '../lesson-ranker.js';
import type { ConsolidatedEntry, LessonFeedback } from '../types.js';

function makeConsolidated(overrides: Partial<ConsolidatedEntry> & { id: string }): ConsolidatedEntry {
  return {
    canonicalText: 'test lesson',
    sources: [],
    projectIds: [],
    manifestIds: [],
    tags: [],
    frequency: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFeedback(
  overrides: Partial<Omit<LessonFeedback, 'id' | 'createdAt'>>,
): Omit<LessonFeedback, 'id' | 'createdAt'> {
  return {
    targetId: 'entry-1',
    helpful: true,
    rating: 4,
    userId: 'user-1',
    ...overrides,
  };
}

// ─── KnowledgeRatingStore ─────────────────────────────────────

describe('KnowledgeRatingStore', () => {
  let store: KnowledgeRatingStore;

  beforeEach(() => {
    store = new KnowledgeRatingStore();
  });

  it('starts empty', () => {
    expect(store.size).toBe(0);
    expect(store.distinctTargetCount).toBe(0);
  });

  it('adds and retrieves feedback', () => {
    const fb = store.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    expect(fb.id).toBeDefined();
    expect(fb.createdAt).toBeDefined();

    const results = store.getFeedback('e1');
    expect(results).toHaveLength(1);
    expect(results[0].rating).toBe(5);
  });

  it('returns empty for unknown target', () => {
    expect(store.getFeedback('nonexistent')).toEqual([]);
  });

  it('computes average rating', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    store.addFeedback(makeFeedback({ targetId: 'e1', rating: 3 }));
    const stats = store.getStats('e1');
    expect(stats.averageRating).toBe(4);
    expect(stats.totalFeedback).toBe(2);
  });

  it('computes Bayesian adjusted rating', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    const stats = store.getStats('e1', 3, 5);
    expect(stats.adjustedRating).toBeCloseTo(3.333, 1);
  });

  it('Bayesian adjustment converges with many votes', () => {
    for (let i = 0; i < 100; i++) {
      store.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    }
    const stats = store.getStats('e1', 3, 5);
    expect(stats.adjustedRating).toBeCloseTo(5, 0);
    expect(stats.averageRating).toBe(5);
  });

  it('computes helpful count', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1', helpful: true, rating: 5 }));
    store.addFeedback(makeFeedback({ targetId: 'e1', helpful: false, rating: 2, reason: 'incorrect' }));
    const stats = store.getStats('e1');
    expect(stats.helpfulCount).toBe(1);
  });

  it('tracks reason counts', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1', helpful: false, rating: 1, reason: 'outdated' }));
    store.addFeedback(makeFeedback({ targetId: 'e1', helpful: false, rating: 2, reason: 'outdated' }));
    store.addFeedback(makeFeedback({ targetId: 'e1', helpful: false, rating: 1, reason: 'incorrect' }));
    const stats = store.getStats('e1');
    expect(stats.reasonCounts.outdated).toBe(2);
    expect(stats.reasonCounts.incorrect).toBe(1);
  });

  it('computes global average across targets', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    store.addFeedback(makeFeedback({ targetId: 'e1', rating: 3 }));
    store.addFeedback(makeFeedback({ targetId: 'e2', rating: 1 }));
    expect(store.getGlobalAverage()).toBe(3);
  });

  it('getAllStats returns stats per target', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    store.addFeedback(makeFeedback({ targetId: 'e2', rating: 2 }));
    const all = store.getAllStats();
    expect(all.size).toBe(2);
    expect(all.get('e1')!.averageRating).toBe(5);
    expect(all.get('e2')!.averageRating).toBe(2);
  });

  it('clear removes all feedback', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1' }));
    store.addFeedback(makeFeedback({ targetId: 'e2' }));
    expect(store.size).toBe(2);
    store.clear();
    expect(store.size).toBe(0);
    expect(store.distinctTargetCount).toBe(0);
  });

  it('getFeedbackByUser returns user feedback', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1', userId: 'alice', rating: 5 }));
    store.addFeedback(makeFeedback({ targetId: 'e2', userId: 'bob', rating: 3 }));
    store.addFeedback(makeFeedback({ targetId: 'e3', userId: 'alice', rating: 4 }));
    expect(store.getFeedbackByUser('alice')).toHaveLength(2);
    expect(store.getFeedbackByUser('bob')).toHaveLength(1);
  });

  it('hasFeedback returns correct boolean', () => {
    store.addFeedback(makeFeedback({ targetId: 'e1' }));
    expect(store.hasFeedback('e1')).toBe(true);
    expect(store.hasFeedback('e2')).toBe(false);
  });
});

// ─── LessonRanker ─────────────────────────────────────────────

describe('LessonRanker', () => {
  let ratingStore: KnowledgeRatingStore;
  let ranker: LessonRanker;

  beforeEach(() => {
    ratingStore = new KnowledgeRatingStore();
    ranker = new LessonRanker();
  });

  it('returns default score for entries with no feedback', () => {
    const entry = makeConsolidated({ id: 'e1' });
    const ranked = ranker.rank([entry], ratingStore);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rankScore).toBe(50);
    expect(ranked[0].feedbackCount).toBe(0);
  });

  it('sorts by rankScore descending', () => {
    const e1 = makeConsolidated({ id: 'e1', canonicalText: 'high' });
    const e2 = makeConsolidated({ id: 'e2', canonicalText: 'low' });

    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'e2', rating: 1 }));

    const ranked = ranker.rank([e1, e2], ratingStore);
    expect(ranked[0].id).toBe('e1');
    expect(ranked[1].id).toBe('e2');
  });

  it('getTop returns top K entries', () => {
    const entries = ['a', 'b', 'c'].map(id => makeConsolidated({ id }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'a', rating: 5 }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'b', rating: 3 }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'c', rating: 1 }));

    const top = ranker.getTop(entries, ratingStore, 2);
    expect(top).toHaveLength(2);
    expect(top[0].id).toBe('a');
    expect(top[1].id).toBe('b');
  });

  it('Bayesian adjustment rewards high-rated entries with more votes', () => {
    const e1 = makeConsolidated({ id: 'e1', canonicalText: '5 stars 1 vote' });
    const e2 = makeConsolidated({ id: 'e2', canonicalText: '4.8 stars 100 votes' });

    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 5 }));
    for (let i = 0; i < 100; i++) {
      const r = i < 80 ? 5 : 4;
      ratingStore.addFeedback(makeFeedback({ targetId: 'e2', rating: r as any, userId: `u${i}` }));
    }

    const ranked = ranker.rank([e1, e2], ratingStore);
    expect(ranked[0].id).toBe('e2');
    expect(ranked[0].rankScore).toBeGreaterThan(ranked[1].rankScore);
  });

  it('unsafe reason auto-suppresses with score 0', () => {
    const entry = makeConsolidated({ id: 'e1', canonicalText: 'unsafe lesson' });
    ratingStore.addFeedback(makeFeedback({
      targetId: 'e1',
      helpful: false,
      rating: 1,
      reason: 'unsafe',
    }));

    const ranked = ranker.rank([entry], ratingStore);
    expect(ranked[0].rankScore).toBe(0);
  });

  it('shouldSuppress returns true for unsafe reason', () => {
    const entry = makeConsolidated({ id: 'e1' });
    ratingStore.addFeedback(makeFeedback({
      targetId: 'e1',
      helpful: false,
      rating: 1,
      reason: 'unsafe',
    }));
    expect(ranker.shouldSuppress(entry, ratingStore)).toBe(true);
  });

  it('shouldSuppress returns true for low adjusted rating', () => {
    const entry = makeConsolidated({ id: 'e1' });
    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 1 }));
    expect(ranker.shouldSuppress(entry, ratingStore)).toBe(true);
  });

  it('shouldSuppress returns false for no feedback', () => {
    const entry = makeConsolidated({ id: 'e1' });
    expect(ranker.shouldSuppress(entry, ratingStore)).toBe(false);
  });

  it('suppressLowRated filters correctly', () => {
    const low = makeConsolidated({ id: 'low' });
    const high = makeConsolidated({ id: 'high' });
    const none = makeConsolidated({ id: 'none' });

    for (let i = 0; i < 6; i++) {
      ratingStore.addFeedback(makeFeedback({ targetId: 'low', rating: 1, userId: `u${i}` }));
    }
    ratingStore.addFeedback(makeFeedback({ targetId: 'high', rating: 5, userId: 'a' }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'high', rating: 5, userId: 'b' }));

    const filtered = ranker.suppressLowRated([low, high, none], ratingStore);
    const ids = filtered.map(e => e.id);
    expect(ids).toContain('high');
    expect(ids).toContain('none');
    expect(ids).not.toContain('low');
  });

  it('topNegativeReasons returns sorted reasons', () => {
    const entry = makeConsolidated({ id: 'e1' });
    ratingStore.addFeedback(makeFeedback({
      targetId: 'e1', helpful: false, rating: 1, reason: 'outdated',
    }));
    ratingStore.addFeedback(makeFeedback({
      targetId: 'e1', helpful: false, rating: 2, reason: 'outdated',
    }));
    ratingStore.addFeedback(makeFeedback({
      targetId: 'e1', helpful: false, rating: 1, reason: 'incorrect',
    }));

    const ranked = ranker.rank([entry], ratingStore);
    const reasons = ranked[0].topNegativeReasons;
    expect(reasons[0]).toEqual({ reason: 'outdated', count: 2 });
    expect(reasons[1]).toEqual({ reason: 'incorrect', count: 1 });
  });

  it('recency component affects score', () => {
    const recent = makeConsolidated({ id: 'recent' });
    const old = makeConsolidated({ id: 'old' });

    ratingStore.addFeedback(makeFeedback({ targetId: 'recent', rating: 5 }));
    const oldFb = ratingStore.addFeedback(makeFeedback({ targetId: 'old', rating: 5 }));

    // manually tweak old feedback's createdAt to 60 days ago
    const past = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const feedbackMap = (ratingStore as any).feedback as Map<string, any>;
    const oldEntry = feedbackMap.get(oldFb.id);
    feedbackMap.set(oldFb.id, { ...oldEntry, createdAt: past });

    const ranked = ranker.rank([recent, old], ratingStore);
    expect(ranked[0].id).toBe('recent');
  });
});

// ─── KnowledgeBase Integration ─────────────────────────────────

describe('KnowledgeBase with feedback', () => {
  let ratingStore: KnowledgeRatingStore;
  let ranker: LessonRanker;

  beforeEach(() => {
    ratingStore = new KnowledgeRatingStore();
    ranker = new LessonRanker();
  });

  it('submitFeedback stores and returns feedback', () => {
    const fb = ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 5, userId: 'alice' }));
    expect(fb.id).toBeDefined();
    expect(ratingStore.hasFeedback('e1')).toBe(true);
  });

  it('getTopLessons returns ranked consolidated entries', () => {
    const e1 = makeConsolidated({ id: 'best', canonicalText: 'best lesson' });
    const e2 = makeConsolidated({ id: 'worst', canonicalText: 'worst lesson' });

    ratingStore.addFeedback(makeFeedback({ targetId: 'best', rating: 5 }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'best', rating: 5 }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'worst', rating: 1 }));

    const top = ranker.getTop([e1, e2], ratingStore, 5);
    expect(top).toHaveLength(2);
    expect(top[0].id).toBe('best');
    expect(top[0].rankScore).toBeGreaterThan(50);
  });

  it('returns empty when no entries', () => {
    const top = ranker.getTop([], ratingStore, 5);
    expect(top).toEqual([]);
  });

  it('suppressed entries are filtered from results', () => {
    const suppressed = makeConsolidated({ id: 'bad', canonicalText: 'bad lesson' });
    const normal = makeConsolidated({ id: 'good', canonicalText: 'good lesson' });

    for (let i = 0; i < 6; i++) {
      ratingStore.addFeedback(makeFeedback({ targetId: 'bad', rating: 1, userId: `u${i}` }));
    }
    ratingStore.addFeedback(makeFeedback({ targetId: 'good', rating: 5, userId: 'a' }));

    const filtered = ranker.suppressLowRated([suppressed, normal], ratingStore);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('good');
  });

  it('feedback stats reflect multiple submissions', () => {
    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 5, userId: 'u1' }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 4, userId: 'u2' }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', rating: 3, userId: 'u3' }));

    const stats = ratingStore.getStats('e1');
    expect(stats.totalFeedback).toBe(3);
    expect(stats.averageRating).toBe(4);
    expect(stats.helpfulCount).toBe(3);
  });

  it('unsafe reason causes score 0 in rank', () => {
    const entry = makeConsolidated({ id: 'e1' });
    ratingStore.addFeedback(makeFeedback({
      targetId: 'e1',
      helpful: false,
      rating: 1,
      reason: 'unsafe',
      userId: 'u1',
    }));
    ratingStore.addFeedback(makeFeedback({
      targetId: 'e1',
      helpful: true,
      rating: 5,
      userId: 'u2',
    }));

    const ranked = ranker.rank([entry], ratingStore);
    expect(ranked[0].rankScore).toBe(0);
  });

  it('getFeedback returns all feedback regardless of user', () => {
    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', userId: 'u1' }));
    ratingStore.addFeedback(makeFeedback({ targetId: 'e1', userId: 'u2' }));
    expect(ratingStore.getFeedback('e1')).toHaveLength(2);
  });
});
