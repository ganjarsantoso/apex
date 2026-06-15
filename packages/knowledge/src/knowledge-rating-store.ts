import { generateId } from '@apex/shared';
import type { LessonFeedback, FeedbackStats, FeedbackReason } from './types.js';

export class KnowledgeRatingStore {
  private feedback: Map<string, LessonFeedback> = new Map();

  addFeedback(feedback: Omit<LessonFeedback, 'id' | 'createdAt'>): LessonFeedback {
    const created: LessonFeedback = {
      ...feedback,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.feedback.set(created.id, created);
    return created;
  }

  getFeedback(targetId: string): LessonFeedback[] {
    return Array.from(this.feedback.values()).filter(f => f.targetId === targetId);
  }

  getAllFeedback(): LessonFeedback[] {
    return Array.from(this.feedback.values());
  }

  getFeedbackByUser(userId: string): LessonFeedback[] {
    return Array.from(this.feedback.values()).filter(f => f.userId === userId);
  }

  getStats(targetId: string, globalAvg?: number, minConfidenceVotes = 5): FeedbackStats {
    const entries = this.getFeedback(targetId);
    const totalFeedback = entries.length;

    if (totalFeedback === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        adjustedRating: 0,
        helpfulCount: 0,
        reasonCounts: {},
      };
    }

    const sumRating = entries.reduce((s, f) => s + f.rating, 0);
    const averageRating = sumRating / totalFeedback;
    const helpfulCount = entries.filter(f => f.helpful).length;

    const reasonCounts: Partial<Record<FeedbackReason, number>> = {};
    for (const entry of entries) {
      if (entry.reason) {
        reasonCounts[entry.reason] = (reasonCounts[entry.reason] ?? 0) + 1;
      }
    }

    const v = totalFeedback;
    const R = averageRating;
    const C = globalAvg ?? 3;
    const m = minConfidenceVotes;
    const adjustedRating = (v / (v + m)) * R + (m / (v + m)) * C;

    return { totalFeedback, averageRating, adjustedRating, helpfulCount, reasonCounts };
  }

  getAllStats(minConfidenceVotes = 5): Map<string, FeedbackStats> {
    const targetIds = [...new Set(Array.from(this.feedback.values()).map(f => f.targetId))];
    const globalAvg = this.getGlobalAverage();

    const result = new Map<string, FeedbackStats>();
    for (const id of targetIds) {
      result.set(id, this.getStats(id, globalAvg, minConfidenceVotes));
    }
    return result;
  }

  getGlobalAverage(): number {
    const all = this.getAllFeedback();
    if (all.length === 0) return 3;
    return all.reduce((s, f) => s + f.rating, 0) / all.length;
  }

  hasFeedback(targetId: string): boolean {
    return this.feedback.values().some(f => f.targetId === targetId);
  }

  get distinctTargetCount(): number {
    return new Set(Array.from(this.feedback.values()).map(f => f.targetId)).size;
  }

  get size(): number {
    return this.feedback.size;
  }

  clear(): void {
    this.feedback.clear();
  }
}
