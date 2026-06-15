import type { PatternPack, ValidationReport, ValidationError, ProjectPattern, ConflictEntry } from './types.js';

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ID_RE = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$/;

function validatePattern(p: ProjectPattern, index: number): ValidationError[] {
  const prefix = `patterns[${index}]`;
  const errors: ValidationError[] = [];

  if (!p.id || typeof p.id !== 'string') {
    errors.push({ path: `${prefix}.id`, message: 'Pattern id is required', severity: 'error' });
  } else if (!ID_RE.test(p.id)) {
    errors.push({ path: `${prefix}.id`, message: `Pattern id "${p.id}" must match ^[a-z0-9]+(\\.[a-z0-9]+)*$`, severity: 'error' });
  }

  if (!p.name || typeof p.name !== 'string' || p.name.trim().length === 0) {
    errors.push({ path: `${prefix}.name`, message: 'Pattern name is required', severity: 'error' });
  }

  if (!Array.isArray(p.triggerKeywords)) {
    errors.push({ path: `${prefix}.triggerKeywords`, message: 'triggerKeywords must be an array', severity: 'error' });
  } else {
    if (p.triggerKeywords.length === 0) {
      errors.push({ path: `${prefix}.triggerKeywords`, message: 'At least 1 triggerKeyword is required', severity: 'error' });
    } else if (p.triggerKeywords.length > 100) {
      errors.push({ path: `${prefix}.triggerKeywords`, message: `Has ${p.triggerKeywords.length} keywords; consider limiting to 100`, severity: 'warning' });
    }
    const seen = new Set<string>();
    for (const kw of p.triggerKeywords) {
      if (seen.has(kw.toLowerCase())) {
        errors.push({ path: `${prefix}.triggerKeywords`, message: `Duplicate keyword "${kw}"`, severity: 'warning' });
      }
      seen.add(kw.toLowerCase());
    }
  }

  if (!Array.isArray(p.lessons)) {
    errors.push({ path: `${prefix}.lessons`, message: 'lessons must be an array', severity: 'error' });
  } else {
    if (p.lessons.length === 0) {
      errors.push({ path: `${prefix}.lessons`, message: 'At least 1 lesson is required', severity: 'error' });
    } else if (p.lessons.length > 50) {
      errors.push({ path: `${prefix}.lessons`, message: `Has ${p.lessons.length} lessons; max is 50`, severity: 'error' });
    }
    for (let i = 0; i < p.lessons.length; i++) {
      if (p.lessons[i].length < 10) {
        errors.push({ path: `${prefix}.lessons[${i}]`, message: 'Lesson is too short (under 10 chars)', severity: 'warning' });
      }
    }
  }

  if (Array.isArray(p.recommendedTasks) && p.recommendedTasks.length === 0) {
    errors.push({ path: `${prefix}.recommendedTasks`, message: 'recommendedTasks is empty', severity: 'warning' });
  }

  if (Array.isArray(p.antiPatterns) && p.antiPatterns.length === 0) {
    errors.push({ path: `${prefix}.antiPatterns`, message: 'antiPatterns is empty', severity: 'warning' });
  }

  return errors;
}

export class PatternValidator {
  validate(pack: PatternPack): ValidationReport {
    const errors: ValidationError[] = [];
    const prefix = '';

    if (!pack.schemaVersion || typeof pack.schemaVersion !== 'string') {
      errors.push({ path: `${prefix}.schemaVersion`, message: 'schemaVersion is required', severity: 'error' });
    }

    if (!pack.name || typeof pack.name !== 'string' || pack.name.trim().length === 0) {
      errors.push({ path: `${prefix}.name`, message: 'Pack name is required', severity: 'error' });
    }

    if (!pack.version || typeof pack.version !== 'string') {
      errors.push({ path: `${prefix}.version`, message: 'Version is required', severity: 'error' });
    } else if (!SEMVER_RE.test(pack.version)) {
      errors.push({ path: `${prefix}.version`, message: `"${pack.version}" is not valid semver (X.Y.Z)`, severity: 'error' });
    }

    if (!Array.isArray(pack.patterns)) {
      errors.push({ path: `${prefix}.patterns`, message: 'patterns must be an array', severity: 'error' });
      return { valid: errors.every(e => e.severity === 'warning'), errors };
    }

    if (pack.patterns.length === 0) {
      errors.push({ path: `${prefix}.patterns`, message: 'At least 1 pattern is required', severity: 'error' });
    }

    const seenIds = new Set<string>();
    for (let i = 0; i < pack.patterns.length; i++) {
      const p = pack.patterns[i];
      const patternErrors = validatePattern(p, i);
      errors.push(...patternErrors);

      if (p.id && seenIds.has(p.id)) {
        errors.push({ path: `patterns[${i}].id`, message: `Duplicate pattern id "${p.id}"`, severity: 'error' });
      }
      seenIds.add(p.id);
    }

    return { valid: errors.every(e => e.severity === 'warning'), errors };
  }

  validatePattern(p: ProjectPattern): string[] {
    const errors = validatePattern(p, 0);
    return errors.map(e => `[${e.severity}] ${e.path}: ${e.message}`);
  }

  checkConflicts(pack: PatternPack, existing: Map<string, ProjectPattern>): ConflictEntry[] {
    const conflicts: ConflictEntry[] = [];

    for (const incoming of pack.patterns) {
      const existingPattern = existing.get(incoming.id);
      if (!existingPattern) continue;

      const fields: Array<{ field: string; existing: unknown; incoming: unknown }> = [
        { field: 'name', existing: existingPattern.name, incoming: incoming.name },
        { field: 'triggerKeywords', existing: existingPattern.triggerKeywords, incoming: incoming.triggerKeywords },
        { field: 'lessons', existing: existingPattern.lessons, incoming: incoming.lessons },
        { field: 'recommendedTasks', existing: existingPattern.recommendedTasks, incoming: incoming.recommendedTasks },
        { field: 'antiPatterns', existing: existingPattern.antiPatterns, incoming: incoming.antiPatterns },
      ];

      for (const f of fields) {
        const exStr = JSON.stringify(f.existing);
        const inStr = JSON.stringify(f.incoming);
        if (exStr !== inStr) {
          conflicts.push({
            patternId: incoming.id,
            field: f.field,
            existingValue: f.existing,
            incomingValue: f.incoming,
            resolution: 'skip',
          });
        }
      }
    }

    return conflicts;
  }
}


