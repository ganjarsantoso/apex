export const TOKEN_BUDGETS = {
  DISCOVERY: 4000,
  PLANNING: 3000,
  APPROVED: 1000,
  EXECUTING: 2000,
  REVIEW: 2500,
} as const;

export const TASK_SIZE_MINUTES_MIN = 2;
export const TASK_SIZE_MINUTES_MAX = 5;

export const TDD_COVERAGE_TARGET = 80;

export const MAX_RETRIES_PER_TASK = 2;

export const ACTIVE_MEMORY_K_TOKENS = 2;
export const WORKING_MEMORY_K_TOKENS = 4;
export const ARCHIVE_MEMORY_K_TOKENS = 6;

export const COMPRESSION_TRIGGER_TASK_COUNT = 3;
export const COMPRESSION_BLOCKED_DURATION_MS = 300_000;

export const HOOK_PROFILES = {
  minimal: 'minimal',
  standard: 'standard',
  strict: 'strict',
} as const;

export const APEX_VERSION = '0.1.0';
