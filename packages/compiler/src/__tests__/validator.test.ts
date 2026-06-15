import { describe, it, expect } from 'vitest';
import { PlanValidator } from '../validator.js';
import { ExecutionPlan } from '@apex/types';

function makeValidPlan(): ExecutionPlan {
  return {
    version: '1.0.0',
    compiledAt: '2026-06-15T10:00:00.000Z',
    state: 'COMPILED',
    profile: 'execution',
    spec: 'docs/specs/test.md',
    plan: 'docs/plans/test.md',
    tdd: true,
    securityScan: true,
    worktree: 'feature/test',
    tasks: [
      {
        id: 'TASK-001',
        title: 'Implement core',
        objective: 'Build the core functionality',
        dependencies: [],
        files: { create: ['src/core.ts'], test: ['tests/core.test.ts'] },
        steps: [{ description: 'Write test', expectedOutput: 'FAIL' }],
        acceptanceCriteria: ['Tests pass'],
      },
    ],
  };
}

describe('PlanValidator', () => {
  it('validates a correct plan', () => {
    const validator = new PlanValidator();
    const result = validator.validate(makeValidPlan());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects plan with no tasks', () => {
    const validator = new PlanValidator();
    const plan = makeValidPlan();
    plan.tasks = [];
    const result = validator.validate(plan);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Execution plan must contain at least one task');
  });

  it('warns about tasks with missing files', () => {
    const validator = new PlanValidator();
    const plan = makeValidPlan();
    plan.tasks[0].files = {};
    const result = validator.validate(plan);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects missing dependencies', () => {
    const validator = new PlanValidator();
    const plan = makeValidPlan();
    plan.tasks[0].dependencies = ['TASK-NONEXISTENT'];
    const result = validator.validate(plan);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('TASK-NONEXISTENT');
  });
});
