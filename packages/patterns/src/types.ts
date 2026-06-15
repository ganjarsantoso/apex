import type { ProjectPattern, PatternStats } from '@apex/knowledge';

export type { ProjectPattern, PatternStats } from '@apex/knowledge';

export interface PatternPack {
  schemaVersion: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  website?: string;
  license?: string;
  createdAt: string;
  patterns: ProjectPattern[];
  metadata?: Record<string, unknown>;
  signature?: string;
}

export interface PackMeta {
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  website?: string;
  license?: string;
}

export type ConflictStrategy = 'skip' | 'overwrite' | 'rename' | 'fail';

export interface ImportOptions {
  strategy?: ConflictStrategy;
}

export interface ConflictEntry {
  patternId: string;
  field: string;
  existingValue: unknown;
  incomingValue: unknown;
  resolution: ConflictStrategy;
  resolvedId?: string;
}

export interface ImportReport {
  registered: number;
  skipped: number;
  conflicts: ConflictEntry[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationError[];
}
