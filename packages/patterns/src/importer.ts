import type { PatternPack, ImportOptions, ImportReport, ConflictEntry, ConflictStrategy } from './types.js';
import type { PatternRegistry } from '@apex/knowledge';
import { PatternValidator } from './validator.js';
import { readFile } from 'node:fs/promises';

export class PatternImporter {
  private validator: PatternValidator;

  constructor() {
    this.validator = new PatternValidator();
  }

  importPack(data: unknown): PatternPack {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid pack: expected an object');
    }

    const pack = data as Record<string, unknown>;

    if (!Array.isArray(pack.patterns)) {
      throw new Error('Invalid pack: patterns must be an array');
    }

    const report = this.validator.validate(data as PatternPack);
    if (!report.valid) {
      const errorMessages = report.errors
        .filter(e => e.severity === 'error')
        .map(e => `${e.path}: ${e.message}`);
      if (errorMessages.length > 0) {
        throw new Error(`Pack validation failed:\n${errorMessages.join('\n')}`);
      }
    }

    return data as PatternPack;
  }

  async importFromFile(filePath: string): Promise<PatternPack> {
    const content = await readFile(filePath, 'utf-8');
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
    return this.importPack(data);
  }

  importAndRegister(
    pack: PatternPack,
    registry: PatternRegistry,
    options?: ImportOptions,
  ): ImportReport {
    const strategy: ConflictStrategy = options?.strategy ?? 'skip';
    const conflicts: ConflictEntry[] = [];
    let registered = 0;
    let skipped = 0;
    let renameCounter = 0;

    const existingMap = new Map(registry.getAll().map(p => [p.id, p]));

    for (const incoming of pack.patterns) {
      const existing = existingMap.get(incoming.id);

      if (!existing) {
        registry.register(incoming);
        registered++;
        continue;
      }

      const isDifferent =
        existing.name !== incoming.name ||
        JSON.stringify(existing.triggerKeywords) !== JSON.stringify(incoming.triggerKeywords) ||
        JSON.stringify(existing.lessons) !== JSON.stringify(incoming.lessons) ||
        JSON.stringify(existing.recommendedTasks) !== JSON.stringify(incoming.recommendedTasks) ||
        JSON.stringify(existing.antiPatterns) !== JSON.stringify(incoming.antiPatterns);

      if (!isDifferent) {
        skipped++;
        continue;
      }

      switch (strategy) {
        case 'skip':
          skipped++;
          conflicts.push({ patternId: incoming.id, field: 'all', existingValue: existing, incomingValue: incoming, resolution: 'skip' });
          break;

        case 'overwrite':
          registry.unregister(incoming.id);
          registry.register(incoming);
          registered++;
          conflicts.push({ patternId: incoming.id, field: 'all', existingValue: existing, incomingValue: incoming, resolution: 'overwrite' });
          break;

        case 'rename': {
          renameCounter++;
          const newId = `${incoming.id}-${renameCounter}`;
          const renamed = { ...incoming, id: newId };
          registry.register(renamed);
          registered++;
          conflicts.push({ patternId: incoming.id, field: 'id', existingValue: incoming.id, incomingValue: newId, resolution: 'rename', resolvedId: newId });
          break;
        }

        case 'fail':
          throw new Error(`Conflict on pattern "${incoming.id}": existing pattern differs. Use 'skip', 'overwrite', or 'rename' strategy.`);
      }
    }

    return { registered, skipped, conflicts };
  }
}
