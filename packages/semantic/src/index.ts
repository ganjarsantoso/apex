export type { ArtifactType, ArtifactMetadata, VectorRecord, VectorSearchResult, EmbeddingConfig } from './types.js';
export type { EmbeddingProvider } from './embedding/provider.js';
export type { EmbeddingProviderKind } from './embedding/helpers.js';
export type { VectorStore } from './vector-store/types.js';
export type { SearchOptions } from './semantic-retriever.js';
export type { IndexArtifactOptions } from './semantic-indexer.js';

export { InMemoryVectorStore } from './vector-store/in-memory.js';
export { SQLiteVectorStore } from './vector-store/sqlite.js';
export { cosineSimilarity } from './vector-store/types.js';
export { OpenAIEmbedding } from './embedding/openai.js';
export { OllamaEmbedding } from './embedding/ollama.js';
export { LMStudioEmbedding } from './embedding/lm-studio.js';
export { embeddingProviderFromEnv } from './embedding/helpers.js';
export { SemanticRetriever } from './semantic-retriever.js';
export { SemanticIndexer } from './semantic-indexer.js';
