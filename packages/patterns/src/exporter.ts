import type { PatternPack, PackMeta } from './types.js';
import type { ProjectPattern, PatternRegistry } from '@apex/knowledge';

export class PatternExporter {
  export(patterns: ProjectPattern[], meta: PackMeta): PatternPack {
    return {
      schemaVersion: '1.0',
      name: meta.name,
      version: meta.version,
      description: meta.description,
      author: meta.author,
      tags: meta.tags,
      website: meta.website,
      license: meta.license,
      createdAt: new Date().toISOString(),
      patterns: patterns.map(p => ({ ...p })),
    };
  }

  exportFromRegistry(registry: PatternRegistry, meta: PackMeta): PatternPack {
    return this.export(registry.getAll(), meta);
  }
}
