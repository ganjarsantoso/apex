import type { EmbeddingProvider } from './embedding/provider.js';
import type { VectorStore } from './vector-store/types.js';
import type { VectorRecord, ArtifactType, ArtifactMetadata } from './types.js';

export interface IndexArtifactOptions {
  id: string;
  artifactType: ArtifactType;
  content: string;
  metadata?: ArtifactMetadata;
}

export class SemanticIndexer {
  private provider: EmbeddingProvider;
  private store: VectorStore;

  constructor(provider: EmbeddingProvider, store: VectorStore) {
    this.provider = provider;
    this.store = store;
  }

  async index(options: IndexArtifactOptions): Promise<void> {
    const vector = await this.provider.embed(options.content);

    const record: VectorRecord = {
      id: options.id,
      vector,
      artifactType: options.artifactType,
      content: options.content,
      metadata: {
        ...options.metadata,
        timestamp: options.metadata?.timestamp ?? new Date().toISOString(),
      },
    };

    this.store.store(record);
  }

  async indexBatch(items: IndexArtifactOptions[]): Promise<void> {
    const batches: IndexArtifactOptions[][] = [];
    const BATCH_SIZE = 20;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const contents = batch.map(item => item.content);
      const vectors = await this.provider.embedBatch(contents);

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const record: VectorRecord = {
          id: item.id,
          vector: vectors[i],
          artifactType: item.artifactType,
          content: item.content,
          metadata: {
            ...item.metadata,
            timestamp: item.metadata?.timestamp ?? new Date().toISOString(),
          },
        };
        this.store.store(record);
      }
    }
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  getStore(): VectorStore {
    return this.store;
  }
}
