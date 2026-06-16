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

/**
 * Optional companion skills that enhance APEX per phase.
 * These are NOT bundled — users install them via `npx skills add`.
 * Listed here as a canonical reference for docs, CLI, and bootstrap scripts.
 */
export const COMPANION_SKILLS: Record<string, { id: string; publisher: string; description: string }[]> = {
  DISCOVERY: [
    { id: 'ask-questions-if-underspecified', publisher: 'Trail of Bits', description: 'Helps Brain detect ambiguous objectives and ask clarifying questions.' },
  ],
  PLANNING: [
    { id: 'security-threat-model', publisher: 'OpenAI', description: 'AppSec threat modeling before COMPILE locks the plan.' },
    { id: 'plan-eng-review', publisher: 'Garry Tan', description: 'Engineering-manager review of plan before approval.' },
  ],
  EXECUTING: [
    { id: 'property-based-testing', publisher: 'Trail of Bits', description: 'Property-based testing guidance for the TDD loop.' },
  ],
  REVIEW: [
    { id: 'differential-review', publisher: 'Trail of Bits', description: 'Security-focused differential review on diffs and PRs.' },
  ],
};

export const COMPANION_SKILLS_INSTALL_CMD = 'npx skills add trailofbits/skills@ask-questions-if-underspecified -g -y && npx skills add openai/skills@security-threat-model -g -y && npx skills add trailofbits/skills@property-based-testing -g -y && npx skills add trailofbits/skills@differential-review -g -y';

/**
 * plan-eng-review (Garry Tan) is bundled inside gstack — install the whole package:
 *   npx skills add https://github.com/garrytan/gstack -g -y
 * It includes 23 skills (plan-eng-review, plan-ceo-review, review, retro, browse, ship, etc.)
 * and is NOT installed by default to avoid context bloat.
 */
