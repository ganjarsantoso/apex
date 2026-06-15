import type { ProjectPattern } from './types.js';

export class PatternRegistry {
  private patterns: Map<string, ProjectPattern> = new Map();

  register(pattern: ProjectPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  registerMany(patterns: ProjectPattern[]): void {
    for (const p of patterns) {
      this.register(p);
    }
  }

  unregister(id: string): void {
    this.patterns.delete(id);
  }

  get(id: string): ProjectPattern | undefined {
    return this.patterns.get(id);
  }

  getAll(): ProjectPattern[] {
    return Array.from(this.patterns.values());
  }

  findMatching(text: string, topK = 3): ProjectPattern[] {
    const lower = text.toLowerCase();
    const scored: Array<{ pattern: ProjectPattern; score: number }> = [];

    for (const pattern of this.patterns.values()) {
      if (pattern.triggerKeywords.length === 0) continue;
      const matched = pattern.triggerKeywords.filter(k => lower.includes(k.toLowerCase())).length;
      if (matched > 0) {
        scored.push({ pattern, score: matched });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const fallback = this.patterns.get('default');
    const results = scored.slice(0, topK).map(s => s.pattern);
    if (results.length === 0 && fallback) {
      return [fallback];
    }
    return results;
  }

  clear(): void {
    this.patterns.clear();
  }

  get size(): number {
    return this.patterns.size;
  }
}
