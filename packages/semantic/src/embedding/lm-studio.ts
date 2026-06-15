import type { EmbeddingConfig } from '../types.js';
import { OpenAIEmbedding, type OpenAIEmbeddingOptions } from './openai.js';

export interface LMStudioEmbeddingOptions {
  baseUrl?: string;
  model?: string;
}

export class LMStudioEmbedding extends OpenAIEmbedding {
  constructor(options: LMStudioEmbeddingOptions = {}) {
    const opts: OpenAIEmbeddingOptions = {
      apiKey: 'not-needed',
      model: options.model ?? 'text-embedding-nomic',
      baseUrl: options.baseUrl ?? 'http://localhost:1234/v1',
    };
    super(opts);
  }

  static fromEnv(): LMStudioEmbedding {
    return new LMStudioEmbedding({
      baseUrl: process.env.LM_STUDIO_BASE_URL,
      model: process.env.LM_STUDIO_EMBEDDING_MODEL,
    });
  }
}
