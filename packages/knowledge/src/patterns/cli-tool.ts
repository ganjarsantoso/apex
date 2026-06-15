import type { ProjectPattern } from '../types.js';

export const CLI_TOOL_PATTERN: ProjectPattern = {
  id: 'cli-tool',
  name: 'CLI Tool',
  triggerKeywords: ['cli', 'command', 'terminal', 'script', 'console', 'stdin', 'stdout'],
  lessons: [
    'Use a command-line argument parser (yargs, commander) for consistent flag handling',
    'Implement --help and --version flags from day one',
    'Use colored output for readability (chalk or similar)',
    'Handle SIGINT gracefully for long-running commands',
  ],
  recommendedTasks: [
    'Set up argument parsing with yargs or commander',
    'Implement help text and usage examples',
    'Add progress indicators for long-running operations',
    'Write integration tests for pipeline composition',
  ],
  antiPatterns: [
    'Avoid manual argv parsing — use a well-tested library',
    'Do not hardcode output paths — use current working directory or config',
    'Avoid silent failures — always surface errors with exit codes',
    'Do not assume POSIX-only features on Windows',
  ],
};
