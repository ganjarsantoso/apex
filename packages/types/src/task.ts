import { z } from 'zod';

export const TaskStepSchema = z.object({
  description: z.string(),
  expectedOutput: z.string().optional(),
  command: z.string().optional(),
});

export type TaskStep = z.infer<typeof TaskStepSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  dependencies: z.array(z.string()),
  files: z.object({
    create: z.array(z.string()).optional(),
    modify: z.array(z.string()).optional(),
    test: z.array(z.string()).optional(),
  }),
  steps: z.array(TaskStepSchema),
  acceptanceCriteria: z.array(z.string()),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'FAILED']).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskGraphSchema = z.object({
  milestone: z.string(),
  tasks: z.array(TaskSchema),
  dependencies: z.record(z.array(z.string())).optional(),
});

export type TaskGraph = z.infer<typeof TaskGraphSchema>;
