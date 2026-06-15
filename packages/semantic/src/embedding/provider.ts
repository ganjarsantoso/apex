import type { EmbeddingConfig } from '../types.js';

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getConfig(): EmbeddingConfig;
}
