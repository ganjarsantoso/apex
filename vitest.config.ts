import { defineConfig } from 'vitest/config';
import path from 'path';

const packages = [
  'types', 'shared', 'events', 'orchestration', 'brain', 'planner',
  'compiler', 'engine', 'context', 'sentinel', 'manifest', 'registry', 'scheduler', 'model-router', 'memory-graph', 'knowledge', 'retrospective', 'semantic', 'patterns',
];

const alias: Record<string, string> = {};
for (const pkg of packages) {
  alias[`@apex/${pkg}`] = path.resolve(__dirname, `packages/${pkg}/src`);
}

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias,
  },
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});