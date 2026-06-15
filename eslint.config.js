export default [
  {
    ignores: ['node_modules/**', 'dist/**', '**/*.test.ts'],
  },
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
