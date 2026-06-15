import type { SimilarityMatch, KnowledgeEntry } from './types.js';

export interface SimilarityProvider {
  search(query: string, topK?: number): SimilarityMatch[];
}

export interface LessonProvider {
  getLessons(topic: string): KnowledgeEntry[];
}

export interface KnowledgeProvider extends SimilarityProvider, LessonProvider {}
