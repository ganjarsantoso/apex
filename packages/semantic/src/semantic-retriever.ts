import type { EmbeddingProvider } from './embedding/provider.js';
import type { VectorStore, SearchFilter } from './vector-store/types.js';
import type { VectorSearchResult, ArtifactType } from './types.js';

export interface SearchOptions {
  artifactType?: ArtifactType | ArtifactType[];
  projectId?: string;
  tags?: string[];
}

export class SemanticRetriever {
  private provider: EmbeddingProvider;
  private store: VectorStore;

  constructor(provider: EmbeddingProvider, store: VectorStore) {
    this.provider = provider;
    this.store = store;
  }

  async search(query: string, topK = 5, options?: SearchOptions): Promise<VectorSearchResult[]> {
    const vector = await this.provider.embed(query);

    const filter = this.buildFilter(options);

    if (options?.artifactType) {
      const types = Array.isArray(options.artifactType) ? options.artifactType : [options.artifactType];
      const results: VectorSearchResult[] = [];

      for (const type of types) {
        const typeResults = this.store.searchByType(vector, topK, type, filter as SearchFilter);
        results.push(...typeResults);
      }

      return this.mergeAndDedupe(results).slice(0, topK);
    }

    return this.store.search(vector, topK, filter as SearchFilter);
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.provider.embed(query);
  }

  getDimensions(): number {
    return this.provider.getConfig().dimensions;
  }

  getStats() {
    return this.store.stats();
  }

  private buildFilter(options?: SearchOptions): SearchFilter | undefined {
    if (!options) return undefined;
    const filter: SearchFilter = {};
    if (options.projectId) filter.projectId = options.projectId;
    if (options.tags && options.tags.length > 0) filter.tags = options.tags;
    if (Object.keys(filter).length === 0) return undefined;
    return filter;
  }

  private mergeAndDedupe(results: VectorSearchResult[]): VectorSearchResult[] {
    const seen = new Set<string>();
    return results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    }).sort((a, b) => b.score - a.score);
  }
}
