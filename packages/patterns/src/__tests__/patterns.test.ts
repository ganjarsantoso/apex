import { describe, it, expect, beforeEach } from 'vitest';
import { PatternExporter } from '../exporter.js';
import { PatternImporter } from '../importer.js';
import { PatternValidator } from '../validator.js';
import { PatternSigner } from '../signer.js';
import type { ProjectPattern, PatternRegistry } from '@apex/knowledge';
import type { PatternPack, PackMeta } from '../types.js';

// Re-usable test pattern
const testPattern: ProjectPattern = {
  id: 'team-alpha.react-hooks',
  name: 'React Hooks Best Practices',
  triggerKeywords: ['react', 'hooks', 'useEffect', 'useState'],
  lessons: ['Always list dependencies in useEffect', 'Keep hooks at top level'],
  recommendedTasks: ['Review hook dependencies', 'Add eslint-plugin-react-hooks'],
  antiPatterns: ['Do not call hooks inside conditions', 'Do not skip dependency arrays'],
};

const testPattern2: ProjectPattern = {
  id: 'team-alpha.api-design',
  name: 'API Design Guidelines',
  triggerKeywords: ['api', 'rest', 'endpoint'],
  lessons: ['Use consistent error responses'],
  recommendedTasks: ['Add request validation'],
  antiPatterns: ['Do not expose internals'],
};

const testMeta: PackMeta = {
  name: 'frontend-patterns',
  version: '1.0.0',
  description: 'Frontend development patterns',
  author: 'team-alpha',
  tags: ['react', 'frontend'],
};

function makePack(overrides?: Partial<PatternPack>): PatternPack {
  return {
    schemaVersion: '1.0',
    name: 'test-pack',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    patterns: [testPattern],
    ...overrides,
  };
}

// ─── PatternExporter ─────────────────────────────────────────

describe('PatternExporter', () => {
  let exporter: PatternExporter;

  beforeEach(() => {
    exporter = new PatternExporter();
  });

  it('produces a valid PatternPack', () => {
    const pack = exporter.export([testPattern], testMeta);
    expect(pack.schemaVersion).toBe('1.0');
    expect(pack.name).toBe('frontend-patterns');
    expect(pack.version).toBe('1.0.0');
    expect(pack.createdAt).toBeDefined();
    expect(pack.patterns).toHaveLength(1);
    expect(pack.patterns[0].id).toBe('team-alpha.react-hooks');
  });

  it('exports from registry', () => {
    const registry = { getAll: () => [testPattern, testPattern2] } as unknown as PatternRegistry;
    const pack = exporter.exportFromRegistry(registry, testMeta);
    expect(pack.patterns).toHaveLength(2);
  });

  it('handles empty patterns', () => {
    const pack = exporter.export([], testMeta);
    expect(pack.patterns).toEqual([]);
  });

  it('preserves metadata', () => {
    const pack = exporter.export([testPattern], testMeta);
    expect(pack.description).toBe('Frontend development patterns');
    expect(pack.author).toBe('team-alpha');
    expect(pack.tags).toEqual(['react', 'frontend']);
  });

  it('preserves pattern stats when present', () => {
    const patternWithStats: ProjectPattern = {
      ...testPattern,
      stats: { usageCount: 42, averageRating: 4.5, helpfulCount: 30 },
    };
    const pack = exporter.export([patternWithStats], testMeta);
    expect(pack.patterns[0].stats).toBeDefined();
    expect(pack.patterns[0].stats!.usageCount).toBe(42);
    expect(pack.patterns[0].stats!.averageRating).toBe(4.5);
  });
});

// ─── PatternValidator ────────────────────────────────────────

describe('PatternValidator', () => {
  let validator: PatternValidator;

  beforeEach(() => {
    validator = new PatternValidator();
  });

  it('passes a valid pack', () => {
    const report = validator.validate(makePack());
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('rejects missing schemaVersion', () => {
    const pack = makePack({ schemaVersion: '' } as any);
    const report = validator.validate(pack);
    expect(report.valid).toBe(false);
    expect(report.errors.some(e => e.path.includes('schemaVersion'))).toBe(true);
  });

  it('rejects missing name', () => {
    const pack = makePack({ name: '' } as any);
    const report = validator.validate(pack);
    expect(report.valid).toBe(false);
    expect(report.errors.some(e => e.path.includes('name'))).toBe(true);
  });

  it('rejects bad semver version', () => {
    const pack = makePack({ version: 'abc' } as any);
    const report = validator.validate(pack);
    expect(report.valid).toBe(false);
    expect(report.errors.some(e => e.path.includes('version') && e.severity === 'error')).toBe(true);
  });

  it('rejects invalid pattern id format', () => {
    const pack = makePack({
      patterns: [{ ...testPattern, id: 'Bad ID!' }],
    });
    const report = validator.validate(pack);
    expect(report.valid).toBe(false);
    expect(report.errors.some(e => e.path.includes('id'))).toBe(true);
  });

  it('rejects pattern without triggerKeywords', () => {
    const pack = makePack({
      patterns: [{ ...testPattern, triggerKeywords: [] }],
    });
    const report = validator.validate(pack);
    expect(report.valid).toBe(false);
    expect(report.errors.some(e => e.path.includes('triggerKeywords') && e.severity === 'error')).toBe(true);
  });

  it('rejects pattern without lessons', () => {
    const pack = makePack({
      patterns: [{ ...testPattern, lessons: [] }],
    });
    const report = validator.validate(pack);
    expect(report.valid).toBe(false);
    expect(report.errors.some(e => e.path.includes('lessons') && e.severity === 'error')).toBe(true);
  });

  it('rejects duplicate pattern ids in pack', () => {
    const pack = makePack({
      patterns: [testPattern, { ...testPattern2, id: 'team-alpha.react-hooks' }],
    });
    const report = validator.validate(pack);
    expect(report.errors.some(e => e.message.includes('Duplicate pattern id'))).toBe(true);
  });

  it('warns on duplicate keywords', () => {
    const pack = makePack({
      patterns: [{ ...testPattern, triggerKeywords: ['react', 'react', 'hooks'] }],
    });
    const report = validator.validate(pack);
    expect(report.errors.some(e => e.severity === 'warning' && e.message.includes('Duplicate keyword'))).toBe(true);
  });

  it('warns on short lessons', () => {
    const pack = makePack({
      patterns: [{ ...testPattern, lessons: ['Hi'] }],
    });
    const report = validator.validate(pack);
    expect(report.errors.some(e => e.severity === 'warning' && e.message.includes('too short'))).toBe(true);
  });

  it('checkConflicts detects differing patterns', () => {
    const existing = new Map<string, ProjectPattern>();
    existing.set('team-alpha.react-hooks', {
      ...testPattern,
      lessons: ['Different lesson'],
    });

    const pack = makePack();
    const conflicts = validator.checkConflicts(pack, existing);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].patternId).toBe('team-alpha.react-hooks');
    expect(conflicts[0].field).toBe('lessons');
  });

  it('checkConflicts returns empty for identical patterns', () => {
    const existing = new Map<string, ProjectPattern>();
    existing.set('team-alpha.react-hooks', testPattern);

    const pack = makePack();
    const conflicts = validator.checkConflicts(pack, existing);
    expect(conflicts).toHaveLength(0);
  });

  it('validatePattern returns errors array', () => {
    const errors = validator.validatePattern({ ...testPattern, id: '' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('id');
  });
});

// ─── PatternImporter ─────────────────────────────────────────

describe('PatternImporter', () => {
  let importer: PatternImporter;

  beforeEach(() => {
    importer = new PatternImporter();
  });

  it('importPack returns valid pack', () => {
    const pack = importer.importPack(makePack());
    expect(pack.name).toBe('test-pack');
    expect(pack.patterns).toHaveLength(1);
  });

  it('importPack throws for non-object', () => {
    expect(() => importer.importPack(null)).toThrow('expected an object');
    expect(() => importer.importPack(42)).toThrow('expected an object');
  });

  it('importPack throws for missing patterns array', () => {
    expect(() => importer.importPack({ name: 'x', version: '1.0.0' })).toThrow('patterns must be an array');
  });

  it('importPack throws for validation errors', () => {
    expect(() => importer.importPack({ patterns: [] })).toThrow('Pack validation failed');
  });

  it('importAndRegister no conflicts', () => {
    const registry = { getAll: () => [], register: () => {} } as unknown as PatternRegistry;
    let registered: ProjectPattern[] = [];
    const mockRegistry = {
      getAll: () => [],
      register: (p: ProjectPattern) => { registered.push(p); },
      unregister: () => {},
    } as unknown as PatternRegistry;

    const report = importer.importAndRegister(makePack(), mockRegistry);
    expect(report.registered).toBe(1);
    expect(report.skipped).toBe(0);
    expect(registered).toHaveLength(1);
  });

  it('skip strategy skips conflicts', () => {
    const existing = { ...testPattern };
    const registry = {
      getAll: () => [existing],
      register: () => { throw new Error('should not register'); },
      unregister: () => {},
    } as unknown as PatternRegistry;

    const report = importer.importAndRegister(makePack(), registry, { strategy: 'skip' });
    expect(report.registered).toBe(0);
    expect(report.skipped).toBe(1);
  });

  it('overwrite strategy replaces conflicts', () => {
    let stored: ProjectPattern | null = { ...testPattern, name: 'old' };
    const registry = {
      getAll: () => [stored!],
      register: (p: ProjectPattern) => { stored = p; },
      unregister: (id: string) => { stored = null; },
    } as unknown as PatternRegistry;

    const incoming = { ...testPattern, name: 'new' };
    const report = importer.importAndRegister(makePack({ patterns: [incoming] }), registry, { strategy: 'overwrite' });
    expect(report.registered).toBe(1);
    expect(report.conflicts[0].resolution).toBe('overwrite');
    expect(stored?.name).toBe('new');
  });

  it('rename strategy appends suffix', () => {
    const stored: ProjectPattern[] = [{ ...testPattern, lessons: ['Different version'] }];
    const registry = {
      getAll: () => stored,
      register: (p: ProjectPattern) => { stored.push(p); },
      unregister: () => {},
    } as unknown as PatternRegistry;

    const report = importer.importAndRegister(makePack(), registry, { strategy: 'rename' });
    expect(report.registered).toBe(1);
    expect(report.conflicts[0].resolution).toBe('rename');
    expect(report.conflicts[0].resolvedId).toContain('-1');
  });

  it('fail strategy throws on conflict', () => {
    const registry = {
      getAll: () => [{ ...testPattern, name: 'Different Name' }],
      register: () => {},
      unregister: () => {},
    } as unknown as PatternRegistry;

    expect(() => {
      importer.importAndRegister(makePack(), registry, { strategy: 'fail' });
    }).toThrow('Conflict');
  });
});

// ─── PatternSigner ───────────────────────────────────────────

describe('PatternSigner', () => {
  let signer: PatternSigner;

  beforeEach(() => {
    signer = new PatternSigner();
  });

  it('sign produces a hex signature', () => {
    const pack = makePack();
    const sig = signer.sign(pack, 'my-secret');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verify passes for valid signature', () => {
    const pack = makePack();
    pack.signature = signer.sign(pack, 'my-secret');
    expect(signer.verify(pack, 'my-secret')).toBe(true);
  });

  it('verify fails for tampered data', () => {
    const pack = makePack();
    pack.signature = signer.sign(pack, 'my-secret');
    pack.name = 'tampered-name';
    expect(signer.verify(pack, 'my-secret')).toBe(false);
  });

  it('verify fails for wrong secret', () => {
    const pack = makePack();
    pack.signature = signer.sign(pack, 'secret-a');
    expect(signer.verify(pack, 'secret-b')).toBe(false);
  });

  it('verify fails when no signature', () => {
    const pack = makePack();
    expect(signer.verify(pack, 'secret')).toBe(false);
  });

  it('same content produces same signature', () => {
    const a = makePack();
    const b = makePack();
    const sigA = signer.sign(a, 'secret');
    const sigB = signer.sign(b, 'secret');
    expect(sigA).toBe(sigB);
  });

  it('different content produces different signature', () => {
    const a = makePack();
    const b = makePack({ name: 'different-pack' });
    const sigA = signer.sign(a, 'secret');
    const sigB = signer.sign(b, 'secret');
    expect(sigA).not.toBe(sigB);
  });
});
