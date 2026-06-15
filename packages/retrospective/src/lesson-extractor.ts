import { generateId } from '@apex/shared';
import type { Retrospective, LessonSummary, ImpactFlag, RetrospectiveEvent } from './types.js';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferImpactFlags(category: RetrospectiveEvent, text: string): ImpactFlag[] {
  const flags: ImpactFlag[] = [];
  const lower = text.toLowerCase();
  if (lower.includes('rollback')) flags.push('rollback');
  if (lower.includes('security')) flags.push('security_issue');
  if (lower.includes('review') && lower.includes('fail')) flags.push('review_failure');
  if (lower.includes('depend') || lower.includes('block')) flags.push('dependency_failure');
  return flags;
}

export class LessonExtractor {
  extract(retrospective: Retrospective): LessonSummary[] {
    const lessons: LessonSummary[] = [];

    const categories: { key: RetrospectiveEvent; items: string[] }[] = [
      { key: 'wentWell', items: retrospective.wentWell },
      { key: 'failed', items: retrospective.failed },
      { key: 'repeat', items: retrospective.repeat },
      { key: 'avoid', items: retrospective.avoid },
      { key: 'recommendation', items: retrospective.recommendations },
    ];

    for (const { key, items } of categories) {
      for (const text of items) {
        const impactFlags = inferImpactFlags(key, text);
        lessons.push({
          id: generateId(),
          text,
          category: key,
          impactFlags,
          sourceManifestId: retrospective.manifestId,
          projectId: retrospective.projectId,
          frequency: 1,
          confidence: retrospective.confidence,
          score: 0,
          normalized: normalize(text),
        });
      }
    }

    return lessons;
  }
}
