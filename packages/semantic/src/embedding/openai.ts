import type { EmbeddingConfig } from '../types.js';
import type { EmbeddingProvider } from './provider.js';

export interface OpenAIEmbeddingOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIEmbedding implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private dimensions: number;

  constructor(options: OpenAIEmbeddingOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'text-embedding-3-small';
    this.baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
    this.dimensions = this.model === 'text-embedding-3-small' ? 1536 : 3072;
  }

  static fromEnv(): OpenAIEmbedding {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required');
    return new OpenAIEmbedding({
      apiKey,
      model: process.env.OPENAI_EMBEDDING_MODEL,
      baseUrl: process.env.OPENAI_BASE_URL,
    });
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI embedding failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data.map(d => d.embedding);
  }

  getConfig(): EmbeddingConfig {
    return { model: this.model, dimensions: this.dimensions };
  }
}
