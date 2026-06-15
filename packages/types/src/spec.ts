import { z } from 'zod';

export const ProjectSpecSchema = z.object({
  title: z.string(),
  topic: z.string(),
  description: z.string(),
  architecture: z.string().optional(),
  components: z.array(z.object({
    name: z.string(),
    purpose: z.string(),
    interfaces: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
  })),
  dataFlow: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  filePath: z.string(),
});

export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;

export const ProjectSpecInputSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  description: z.string().min(10),
});

export type ProjectSpecInput = z.infer<typeof ProjectSpecInputSchema>;
