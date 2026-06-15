import type { LessonSummary, ImpactFlag } from './types.js';

export class LessonScorer {
  score(lessons: LessonSummary[], flags: ImpactFlag[] = []): LessonSummary[] {
    return lessons.map(lesson => {
      const frequencyWeight = this.calcFrequencyWeight(lesson.frequency);
      const impactWeight = this.calcImpactWeight([...lesson.impactFlags, ...flags]);
      const specificityWeight = this.calcSpecificityWeight(lesson.text);
      const score = Math.min(frequencyWeight + impactWeight + specificityWeight, 100);

      return { ...lesson, score };
    });
  }

  private calcFrequencyWeight(frequency: number): number {
    if (frequency >= 50) return 40;
    if (frequency >= 20) return 30;
    if (frequency >= 5) return 20;
    if (frequency >= 2) return 10;
    return 0;
  }

  private calcImpactWeight(flags: ImpactFlag[]): number {
    let weight = 0;
    const seen = new Set<ImpactFlag>();
    for (const flag of flags) {
      if (seen.has(flag)) continue;
      seen.add(flag);
      switch (flag) {
        case 'rollback': weight += 40; break;
        case 'security_issue': weight += 30; break;
        case 'review_failure': weight += 20; break;
        case 'dependency_failure': weight += 10; break;
      }
    }
    return Math.min(weight, 40);
  }

  private calcSpecificityWeight(text: string): number {
    const len = text.length;
    if (len >= 80) return 20;
    if (len >= 40) return 15;
    if (len >= 20) return 10;
    return len > 0 ? 5 : 0;
  }
}
