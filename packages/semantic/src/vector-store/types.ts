import type { VectorRecord, VectorSearchResult } from '../types.js';

export interface SearchFilter {
  projectId?: string;
  tags?: string[];
}

export interface VectorStore {
  store(record: VectorRecord): void;
  search(vector: number[], topK: number, filter?: SearchFilter): VectorSearchResult[];
  searchByType(vector: number[], topK: number, artifactType: string, filter?: SearchFilter): VectorSearchResult[];
  delete(id: string): void;
  clear(): void;
  stats(): { vectors: number; dimensions: number };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function float32ArrayToBuffer(vector: number[]): Buffer {
  return Buffer.from(new Float32Array(vector).buffer);
}

export function bufferToFloat32Array(buffer: Buffer): number[] {
  return Array.from(new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4));
}

function matchesFilter(record: VectorRecord, filter?: SearchFilter): boolean {
  if (!filter) return true;
  if (filter.projectId && record.metadata.projectId !== filter.projectId) return false;
  if (filter.tags && filter.tags.length > 0) {
    const recordTags = record.metadata.tags ?? [];
    if (!filter.tags.some(t => recordTags.includes(t))) return false;
  }
  return true;
}

export function filterAndRank(
  records: VectorRecord[],
  vector: number[],
  topK: number,
  filter?: SearchFilter,
): VectorSearchResult[] {
  const scored: Array<{ id: string; score: number }> = [];

  for (const record of records) {
    if (!matchesFilter(record, filter)) continue;
    const score = cosineSimilarity(vector, record.vector);
    if (score > 0) {
      scored.push({ id: record.id, score });
    }
  }

  const top = scored.sort((a, b) => b.score - a.score).slice(0, topK);

  const recordMap = new Map<string, VectorRecord>();
  for (const record of records) {
    recordMap.set(record.id, record);
  }

  return top.map(m => {
    const rec = recordMap.get(m.id)!;
    return {
      id: m.id,
      score: Math.round(m.score * 10000) / 10000,
      artifactType: rec.artifactType,
      content: rec.content,
      metadata: rec.metadata,
    };
  });
}
