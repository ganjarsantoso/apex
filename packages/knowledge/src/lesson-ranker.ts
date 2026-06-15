import type { ConsolidatedEntry, RankedEntry, FeedbackConfig, FeedbackReason, LessonFeedback } from './types.js';
import { KnowledgeRatingStore } from './knowledge-rating-store.js';

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, (now - then) / 86_400_000);
}

function computeRecencyBonus(feedback: LessonFeedback[], recencyWeightDays: number): number {
  if (feedback.length === 0) return 0;
  const latest = feedback.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  const days = daysSince(latest.createdAt);
  return Math.max(0, 20 - (days * 20) / recencyWeightDays);
}

function hasUnsafeReason(feedback: LessonFeedback[]): boolean {
  return feedback.some(f => f.reason === 'unsafe');
}

function getReasonCounts(feedback: LessonFeedback[]): Partial<Record<FeedbackReason, number>> {
  const counts: Partial<Record<FeedbackReason, number>> = {};
  for (const f of feedback) {
    if (f.reason) {
      counts[f.reason] = (counts[f.reason] ?? 0) + 1;
    }
  }
  return counts;
}

const DEFAULT_CONFIG: Required<FeedbackConfig> = {
  enabled: true,
  suppressionThreshold: 2.0,
  minConfidenceVotes: 5,
  recencyWeightDays: 30,
};

export class LessonRanker {
  private config: Required<FeedbackConfig>;

  constructor(config?: FeedbackConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  rank(entries: ConsolidatedEntry[], ratingStore: KnowledgeRatingStore): RankedEntry[] {
    const globalAvg = ratingStore.getGlobalAverage();
    const m = this.config.minConfidenceVotes;

    const ranked: RankedEntry[] = entries.map(entry => {
      const feedback = ratingStore.getFeedback(entry.id);
      const stats = ratingStore.getStats(entry.id, globalAvg, m);

      if (stats.totalFeedback === 0) {
        return {
          id: entry.id,
          entry,
          rankScore: 50,
          adjustedRating: globalAvg,
          rawAverageRating: 0,
          feedbackCount: 0,
          helpfulCount: 0,
          topNegativeReasons: [],
        };
      }

      if (hasUnsafeReason(feedback)) {
        const reasonCounts = getReasonCounts(feedback);
        const topReasons = this.topReasons(reasonCounts);
        return {
          id: entry.id,
          entry,
          rankScore: 0,
          adjustedRating: stats.adjustedRating,
          rawAverageRating: stats.averageRating,
          feedbackCount: stats.totalFeedback,
          helpfulCount: stats.helpfulCount,
          topNegativeReasons: topReasons,
        };
      }

      const ratingComponent = ((stats.adjustedRating - 1) / 4) * 60;
      const volumeComponent = Math.min(stats.totalFeedback / 10, 20);
      const recencyComponent = computeRecencyBonus(feedback, this.config.recencyWeightDays);
      const rankScore = Math.min(ratingComponent + volumeComponent + recencyComponent, 100);

      const reasonCounts = getReasonCounts(feedback);
      const topReasons = this.topReasons(reasonCounts);

      return {
        id: entry.id,
        entry,
        rankScore: Math.round(rankScore * 100) / 100,
        adjustedRating: Math.round(stats.adjustedRating * 100) / 100,
        rawAverageRating: Math.round(stats.averageRating * 100) / 100,
        feedbackCount: stats.totalFeedback,
        helpfulCount: stats.helpfulCount,
        topNegativeReasons: topReasons,
      };
    });

    return ranked.sort((a, b) => b.rankScore - a.rankScore);
  }

  getTop(
    entries: ConsolidatedEntry[],
    ratingStore: KnowledgeRatingStore,
    topK = 10,
  ): RankedEntry[] {
    return this.rank(entries, ratingStore).slice(0, topK);
  }

  shouldSuppress(entry: ConsolidatedEntry, ratingStore: KnowledgeRatingStore): boolean {
    const feedback = ratingStore.getFeedback(entry.id);
    if (feedback.length === 0) return false;
    if (hasUnsafeReason(feedback)) return true;

    const globalAvg = ratingStore.getGlobalAverage();
    const stats = ratingStore.getStats(entry.id, globalAvg, this.config.minConfidenceVotes);
    return stats.adjustedRating < this.config.suppressionThreshold;
  }

  suppressLowRated(
    entries: ConsolidatedEntry[],
    ratingStore: KnowledgeRatingStore,
  ): ConsolidatedEntry[] {
    return entries.filter(e => !this.shouldSuppress(e, ratingStore));
  }

  private topReasons(
    reasonCounts: Partial<Record<FeedbackReason, number>>,
    limit = 3,
  ): Array<{ reason: FeedbackReason; count: number }> {
    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason: reason as FeedbackReason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
