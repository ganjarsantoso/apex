import type { KnowledgeEntry, DuplicateResult } from './types.js';
import { KnowledgeNormalizer } from './knowledge-normalizer.js';
import type { SemanticRetriever } from '@apex/semantic';

function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const minSize = Math.min(a.size, b.size);
  return minSize === 0 ? 0 : intersection.size / minSize;
}

function normalizeEntry(normalizer: KnowledgeNormalizer, entry: KnowledgeEntry): Set<string> {
  return new Set(normalizer.normalize(entry.summary + ' ' + entry.detail).split(' '));
}

export class DuplicateDetector {
  private normalizer: KnowledgeNormalizer;

  constructor(normalizer: KnowledgeNormalizer) {
    this.normalizer = normalizer;
  }

  detect(entries: KnowledgeEntry[], threshold = 0.7): DuplicateResult[] {
    if (entries.length < 2) return [];

    const normalized = entries.map(e => ({
      entry: e,
      tokens: normalizeEntry(this.normalizer, e),
    }));

    const results: DuplicateResult[] = [];

    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const similarity = jaccardOverlap(normalized[i].tokens, normalized[j].tokens);
        if (similarity >= threshold) {
          const a = normalized[i].entry;
          const b = normalized[j].entry;
          const kept = a.summary.length >= b.summary.length ? a : b;
          const merged = a.summary.length >= b.summary.length ? b : a;
          results.push({
            keptId: kept.id,
            mergedId: merged.id,
            similarity: Math.round(similarity * 10000) / 10000,
            method: 'keyword',
          });
        }
      }
    }

    return results;
  }

  async detectSemantic(
    entries: KnowledgeEntry[],
    retriever: SemanticRetriever,
    threshold = 0.85,
  ): Promise<DuplicateResult[]> {
    if (entries.length < 2) return [];

    const results: DuplicateResult[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      if (seen.has(entry.id)) continue;
      const similar = await retriever.search(entry.summary, entries.length);
      for (const match of similar) {
        if (match.id === entry.id) continue;
        if (seen.has(match.id)) continue;
        const matchedEntry = entries.find(e => e.id === match.id);
        if (!matchedEntry) continue;
        if (match.score >= threshold) {
          const kept = entry.summary.length >= matchedEntry.summary.length ? entry : matchedEntry;
          const merged = entry.summary.length >= matchedEntry.summary.length ? matchedEntry : entry;
          results.push({
            keptId: kept.id,
            mergedId: merged.id,
            similarity: match.score,
            method: 'semantic',
          });
          seen.add(merged.id);
        }
      }
      seen.add(entry.id);
    }

    return results;
  }
}
