import type { ProjectPattern } from '../types.js';

export const RAG_SYSTEM_PATTERN: ProjectPattern = {
  id: 'rag-system',
  name: 'RAG System',
  triggerKeywords: ['rag', 'retrieval', 'embedding', 'vector', 'llm', 'chunk', 'semantic'],
  lessons: [
    'Chunking strategy significantly impacts retrieval quality — experiment with overlap sizes',
    'Store metadata alongside embeddings for filtering and provenance',
    'Implement hybrid search (keyword + semantic) for better recall',
    'Cache embeddings to avoid recomputation on repeated content',
  ],
  recommendedTasks: [
    'Design chunking strategy with configurable size and overlap',
    'Set up embedding pipeline with batching',
    'Implement hybrid search (BM25 + vector similarity)',
    'Add metadata filtering for scoped retrieval',
    'Build evaluation harness for retrieval quality metrics',
  ],
  antiPatterns: [
    'Avoid fixed chunk sizes without overlap — overlap improves boundary recall',
    'Do not embed raw text without cleaning (whitespace, encoding)',
    'Avoid using the same embedding model for query and document without normalization',
    'Do not skip evaluation — retrieval quality degrades without metrics',
  ],
};
