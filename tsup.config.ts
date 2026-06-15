import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['packages/*/src/index.ts', 'apps/cli/src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: ['better-sqlite3'],
});
