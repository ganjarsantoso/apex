import { z } from 'zod';
import { TaskSchema } from './task.js';

export const ExecutionPlanSchema = z.object({
  version: z.string(),
  planVersion: z.string().optional(),
  compiledAt: z.string().datetime(),
  state: z.enum(['COMPILED', 'EXECUTING', 'COMPLETE', 'FAILED']),
  profile: z.enum(['execution']),
  spec: z.string(),
  plan: z.string(),
  tdd: z.boolean(),
  securityScan: z.boolean(),
  worktree: z.string().optional(),
  tasks: z.array(TaskSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const CompiledPlanOutputSchema = z.object({
  executionPlan: ExecutionPlanSchema,
  warnings: z.array(z.string()).optional(),
});

export type CompiledPlanOutput = z.infer<typeof CompiledPlanOutputSchema>;
