import type { VectorRecord, VectorSearchResult } from '../types.js';
import { VectorStore, SearchFilter, filterAndRank } from './types.js';

export class InMemoryVectorStore implements VectorStore {
  private records: Map<string, VectorRecord> = new Map();
  private dims = 0;

  store(record: VectorRecord): void {
    this.records.set(record.id, record);
    if (record.vector.length > this.dims) {
      this.dims = record.vector.length;
    }
  }

  search(vector: number[], topK: number, filter?: SearchFilter): VectorSearchResult[] {
    return filterAndRank(Array.from(this.records.values()), vector, topK, filter);
  }

  searchByType(vector: number[], topK: number, artifactType: string, filter?: SearchFilter): VectorSearchResult[] {
    const typed = Array.from(this.records.values()).filter(r => r.artifactType === artifactType);
    return filterAndRank(typed, vector, topK, filter);
  }

  delete(id: string): void {
    this.records.delete(id);
  }

  clear(): void {
    this.records.clear();
    this.dims = 0;
  }

  stats(): { vectors: number; dimensions: number } {
    return { vectors: this.records.size, dimensions: this.dims };
  }
}
