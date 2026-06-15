import type { EmbeddingConfig } from '../types.js';
import type { EmbeddingProvider } from './provider.js';

export interface OllamaEmbeddingOptions {
  baseUrl?: string;
  model?: string;
}

export class OllamaEmbedding implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;

  constructor(options: OllamaEmbeddingOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://localhost:11434';
    this.model = options.model ?? 'nomic-embed-text';
  }

  static fromEnv(): OllamaEmbedding {
    return new OllamaEmbedding({
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_EMBEDDING_MODEL,
    });
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama embedding failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  getConfig(): EmbeddingConfig {
    return { model: this.model, dimensions: 768 };
  }
}
