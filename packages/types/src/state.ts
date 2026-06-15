import { z } from 'zod';

export const PhaseEnum = z.enum([
  'IDEA',
  'DISCOVERY',
  'PLANNING',
  'APPROVED',
  'COMPILED',
  'EXECUTING',
  'FAILED',
  'REVIEW',
  'ROLLBACK',
  'COMPLETE',
]);

export type Phase = z.infer<typeof PhaseEnum>;

export const PhaseTransitionSchema = z.object({
  from: PhaseEnum,
  to: PhaseEnum,
  timestamp: z.string().datetime(),
  trigger: z.string(),
  guardCondition: z.string().optional(),
});

export type PhaseTransition = z.infer<typeof PhaseTransitionSchema>;

export const StateMachineSchema = z.object({
  currentPhase: PhaseEnum,
  history: z.array(PhaseTransitionSchema),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type StateMachine = z.infer<typeof StateMachineSchema>;

export const FailureReasonEnum = z.enum([
  'TEST_FAILURE',
  'SECURITY_VIOLATION',
  'COMPILATION_ERROR',
  'POLICY_VIOLATION',
  'DEPENDENCY_FAILURE',
  'HUMAN_ABORT',
]);

export type FailureReason = z.infer<typeof FailureReasonEnum>;

export const ManifestStateEnum = z.enum([
  'DRAFT',
  'READY',
  'EXECUTING',
  'DEGRADED',
  'REVIEW',
  'COMPLETE',
  'FAILED',
  'ROLLED_BACK',
]);

export type ManifestState = z.infer<typeof ManifestStateEnum>;

export const ManifestTaskStateEnum = z.enum([
  'PENDING',
  'READY',
  'RUNNING',
  'COMPLETE',
  'FAILED',
  'BLOCKED',
]);

export type ManifestTaskState = z.infer<typeof ManifestTaskStateEnum>;

export const PHASE_TRANSITIONS: Record<Phase, { to: Phase[]; guard?: string }> = {
  IDEA: { to: ['DISCOVERY'], guard: 'User request received' },
  DISCOVERY: { to: ['PLANNING'], guard: 'Spec drafted and user approved' },
  PLANNING: { to: ['APPROVED'], guard: 'User approved spec + plan' },
  APPROVED: { to: ['COMPILED'], guard: 'Plan validated, interactive state frozen' },
  COMPILED: { to: ['EXECUTING'], guard: 'Execution-plan.json schema valid' },
  EXECUTING: { to: ['REVIEW', 'FAILED'], guard: 'All tasks DONE or failure detected' },
  FAILED: { to: ['ROLLBACK'], guard: 'Failure acknowledged, rollback initiated' },
  REVIEW: { to: ['COMPLETE', 'EXECUTING'], guard: 'All 3 review stages pass or fail' },
  ROLLBACK: { to: ['PLANNING'], guard: 'Changes reverted, re-plan required' },
  COMPLETE: { to: [], guard: 'Worktree cleaned, report delivered' },
};
