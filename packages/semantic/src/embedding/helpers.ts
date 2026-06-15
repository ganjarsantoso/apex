import { OpenAIEmbedding } from './openai.js';
import { OllamaEmbedding } from './ollama.js';
import { LMStudioEmbedding } from './lm-studio.js';
import type { EmbeddingProvider } from './provider.js';

export type EmbeddingProviderKind = 'openai' | 'ollama' | 'lm-studio';

export function embeddingProviderFromEnv(kind?: EmbeddingProviderKind): EmbeddingProvider {
  const provider = kind ?? (process.env.EMBEDDING_PROVIDER as EmbeddingProviderKind) ?? 'openai';

  switch (provider) {
    case 'ollama':
      return OllamaEmbedding.fromEnv();
    case 'lm-studio':
      return LMStudioEmbedding.fromEnv();
    case 'openai':
    default:
      return OpenAIEmbedding.fromEnv();
  }
}
