import type { LessonSummary, ConsolidationGroup } from './types.js';

function normalizeKey(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  const stems = words.map(w => {
    if (w.endsWith('ing')) return w.slice(0, -3);
    if (w.endsWith('ed')) return w.slice(0, -2);
    if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
    return w;
  });
  return stems.sort().join(' ');
}

function pickBestText(variants: LessonSummary[]): string {
  return variants.reduce((best, v) => v.text.length > best.text.length ? v : best).text;
}

export class LessonConsolidator {
  consolidate(lessons: LessonSummary[]): LessonSummary[] {
    if (lessons.length === 0) return [];

    const groups = new Map<string, ConsolidationGroup>();

    for (const lesson of lessons) {
      const key = normalizeKey(lesson.text);
      const existing = groups.get(key);
      if (existing) {
        existing.variants.push(lesson);
        existing.best = {
          ...existing.best,
          text: pickBestText(existing.variants),
          frequency: existing.variants.length,
          confidence: Math.min(existing.variants.length / 50, 1.0),
          impactFlags: this.mergeFlags(
            existing.variants.flatMap(v => v.impactFlags),
          ),
          score: 0,
        };
      } else {
        groups.set(key, {
          normalized: key,
          variants: [lesson],
          best: { ...lesson },
        });
      }
    }

    return Array.from(groups.values()).map(g => g.best);
  }

  private mergeFlags(flags: string[]): import('./types.js').ImpactFlag[] {
    return Array.from(new Set(flags)) as import('./types.js').ImpactFlag[];
  }
}
