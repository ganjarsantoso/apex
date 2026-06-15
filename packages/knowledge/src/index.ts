export type { SimilarityMatch, Document, RelatedContext, KnowledgeEntry, ProjectPattern, PatternStats, ConsolidatedEntry, SourceRef, SourceRefType, DuplicateResult, Cluster, ConsolidationConfig, ConsolidationReport, LessonFeedback, FeedbackReason, FeedbackStats, FeedbackConfig, RankedEntry } from './types.js';
export type { SimilarityProvider, LessonProvider, KnowledgeProvider } from './providers.js';
export { SimilarityEngine } from './similarity-engine.js';
export { LessonsStore } from './lessons-store.js';
export { ContextRetriever } from './context-retriever.js';
export { PatternRegistry } from './pattern-registry.js';
export { PatternMatcher } from './pattern-matcher.js';
export { DEFAULT_PATTERNS, REACT_SPA_PATTERN, CLI_TOOL_PATTERN, REST_API_PATTERN, RAG_SYSTEM_PATTERN, FALLBACK_PATTERN } from './patterns/index.js';
export { KnowledgeNormalizer } from './knowledge-normalizer.js';
export { DuplicateDetector } from './duplicate-detector.js';
export { KnowledgeClusterer } from './knowledge-clusterer.js';
export { ConsolidatedStore } from './consolidated-store.js';
export { KnowledgeConsolidator } from './knowledge-consolidator.js';
export type { ConsolidationOptions } from './knowledge-consolidator.js';
export { KnowledgeRatingStore } from './knowledge-rating-store.js';
export { LessonRanker } from './lesson-ranker.js';

import type { GraphStore } from '@apex/memory-graph';
import type { ExecutionManifest } from '@apex/manifest';
import type { SemanticRetriever } from '@apex/semantic';
import type { SimilarityMatch, KnowledgeEntry, ProjectPattern, Document, ConsolidationConfig, ConsolidationReport, ConsolidatedEntry, FeedbackConfig, RankedEntry, LessonFeedback } from './types.js';
import type { KnowledgeProvider } from './providers.js';
import { SimilarityEngine } from './similarity-engine.js';
import { LessonsStore } from './lessons-store.js';
import { ContextRetriever } from './context-retriever.js';
import { PatternRegistry } from './pattern-registry.js';
import { PatternMatcher } from './pattern-matcher.js';
import { DEFAULT_PATTERNS } from './patterns/index.js';
import { KnowledgeConsolidator } from './knowledge-consolidator.js';
import { KnowledgeRatingStore } from './knowledge-rating-store.js';
import { LessonRanker } from './lesson-ranker.js';

function extractTags(manifest: ExecutionManifest): string[] {
  const tags = new Set<string>();
  for (const task of manifest.tasks) {
    for (const word of task.title.split(/\s+/)) {
      const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleaned.length > 2) tags.add(cleaned);
    }
  }
  for (const constraint of manifest.constraints) {
    tags.add(constraint.type.toLowerCase());
  }
  return Array.from(tags).slice(0, 15);
}

export class KnowledgeBase implements KnowledgeProvider {
  readonly similarityEngine: SimilarityEngine;
  readonly lessonsStore: LessonsStore;
  readonly contextRetriever: ContextRetriever;
  readonly patternRegistry: PatternRegistry;
  readonly patternMatcher: PatternMatcher;
  readonly consolidator?: KnowledgeConsolidator;
  readonly ratingStore: KnowledgeRatingStore;
  readonly ranker: LessonRanker;
  private feedbackConfig: FeedbackConfig;

  constructor(
    graphStore: GraphStore,
    patterns?: ProjectPattern[],
    options?: {
      consolidationConfig?: ConsolidationConfig;
      semanticRetriever?: SemanticRetriever;
      feedbackConfig?: FeedbackConfig;
    },
  ) {
    this.similarityEngine = new SimilarityEngine();
    this.lessonsStore = new LessonsStore();
    this.contextRetriever = new ContextRetriever(graphStore);
    this.patternRegistry = new PatternRegistry();
    this.patternRegistry.registerMany(DEFAULT_PATTERNS);
    if (patterns && patterns.length > 0) {
      this.patternRegistry.registerMany(patterns);
    }
    this.patternMatcher = new PatternMatcher(this.patternRegistry);
    this.ratingStore = new KnowledgeRatingStore();
    this.feedbackConfig = options?.feedbackConfig ?? { enabled: true };
    this.ranker = new LessonRanker(this.feedbackConfig);

    if (options?.consolidationConfig?.enabled) {
      this.consolidator = new KnowledgeConsolidator(options.consolidationConfig);
    }
  }

  search(query: string, topK = 5): SimilarityMatch[] {
    return this.similarityEngine.search(query, topK);
  }

  getLessons(topic: string): KnowledgeEntry[] {
    return this.lessonsStore.getLessons(topic);
  }

  ingestManifestKnowledge(manifest: ExecutionManifest): void {
    const doc: Document = {
      id: manifest.manifestId,
      text: `${manifest.metadata?.requirement ?? ''} ${manifest.tasks.map(t => t.title).join(' ')}`,
      source: 'manifest',
      projectId: manifest.projectId,
      manifestId: manifest.manifestId,
      tags: extractTags(manifest),
      timestamp: manifest.createdAt,
    };
    this.similarityEngine.indexDocument(doc);

    const patternLessons = this.patternMatcher.getLessons(doc.text);
    for (const lesson of patternLessons) {
      this.lessonsStore.addEntry({
        summary: lesson,
        detail: `From pattern match on manifest ${manifest.manifestId}`,
        tags: ['pattern', ...extractTags(manifest).slice(0, 5)],
        source: 'manifest',
        projectId: manifest.projectId,
        manifestId: manifest.manifestId,
      });
    }

    const entry = this.lessonsStore.addEntry({
      summary: (manifest.metadata?.requirement ?? '').slice(0, 120),
      detail: manifest.metadata?.requirement ?? '',
      tags: extractTags(manifest),
      source: 'manifest',
      projectId: manifest.projectId,
      manifestId: manifest.manifestId,
    });

    if (this.consolidator?.config.autoConsolidateOnIngest) {
      this.runLightweightConsolidation(entry);
    }
  }

  ingestReviewKnowledge(reviewId: string, summary: string, tags: string[], manifestId: string): void {
    const doc: Document = {
      id: reviewId,
      text: summary,
      source: 'review',
      manifestId,
      tags,
    };
    this.similarityEngine.indexDocument(doc);

    this.lessonsStore.addEntry({
      summary: summary.slice(0, 120),
      detail: summary,
      tags,
      source: 'review',
      manifestId,
    });
  }

  getContextForPlanning(taskId: string): { related: import('./types.js').RelatedContext; similar: SimilarityMatch[] } {
    const related = this.contextRetriever.getRelatedContext(taskId);
    const similar = this.search(related.milestone?.title ?? taskId, 3);
    return { related, similar };
  }

  getStats(): { documents: number; lessons: number; patterns: number } {
    return {
      documents: this.similarityEngine.stats.documents,
      lessons: this.lessonsStore.size,
      patterns: this.patternRegistry.size,
    };
  }

  submitFeedback(feedback: Omit<LessonFeedback, 'id' | 'createdAt'>): LessonFeedback {
    return this.ratingStore.addFeedback(feedback);
  }

  getTopLessons(topic: string, topK = 10): RankedEntry[] {
    if (!this.consolidator) return [];
    const consolidated = this.getConsolidatedLessons(topic);
    const ranked = this.ranker.rank(consolidated, this.ratingStore);

    if (this.feedbackConfig.enabled) {
      return ranked.filter(r => r.rankScore > 0).slice(0, topK);
    }
    return ranked.slice(0, topK);
  }

  getFeedbackStats(): { totalFeedback: number; distinctEntries: number; globalAverage: number } {
    return {
      totalFeedback: this.ratingStore.size,
      distinctEntries: this.ratingStore.distinctTargetCount,
      globalAverage: this.ratingStore.getGlobalAverage(),
    };
  }

  async runConsolidation(options?: { useSemantic?: boolean; retriever?: SemanticRetriever }): Promise<ConsolidationReport> {
    if (!this.consolidator) {
      return {
        totalEntries: 0,
        duplicatesFound: 0,
        clustersCreated: 0,
        consolidatedCreated: 0,
        methods: [],
      };
    }

    const entries = this.lessonsStore.all();
    const report = await this.consolidator.consolidate(entries, options);

    for (const consolidated of this.consolidator.store.all()) {
      for (const source of consolidated.sources) {
        this.lessonsStore.updateConsolidatedRef(source.id, consolidated.id);
      }
    }

    return report;
  }

  getConsolidatedLessons(topic: string): ConsolidatedEntry[] {
    if (!this.consolidator) return [];
    const lower = topic.toLowerCase();
    const keywords = lower.split(/\s+/).filter(t => t.length > 2);
    return this.consolidator.store.all().filter(e => {
      if (e.tags.some(t => lower.includes(t.toLowerCase()))) return true;
      return keywords.some(k => e.canonicalText.toLowerCase().includes(k));
    });
  }

  getConsolidationStats(): { entries: number; consolidated: number; clusters: number } {
    if (!this.consolidator) {
      return { entries: 0, consolidated: 0, clusters: 0 };
    }
    const stats = this.consolidator.store.getStats();
    return {
      entries: this.lessonsStore.size,
      ...stats,
    };
  }

  private runLightweightConsolidation(entry: KnowledgeEntry): void {
    if (!this.consolidator) return;
    const existing = this.lessonsStore.all().filter(e => e.id !== entry.id);
    const similar = this.consolidator.findSimilar(entry, existing);
    if (similar) {
      this.lessonsStore.updateConsolidatedRef(entry.id, similar.id);
    }
  }
}
