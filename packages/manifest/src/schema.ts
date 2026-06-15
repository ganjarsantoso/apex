import { z } from 'zod';
import { ManifestStateEnum, ManifestTaskStateEnum } from '@apex/types';

export const ConstraintTypeEnum = z.enum(['SECURITY', 'CAPABILITY', 'COMPLIANCE', 'BUSINESS']);
export type ConstraintType = z.infer<typeof ConstraintTypeEnum>;

export const ReviewStageEnum = z.enum(['CODE', 'SECURITY', 'ARCHITECTURE']);
export type ReviewStage = z.infer<typeof ReviewStageEnum>;

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  taskIds: z.array(z.string()),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

export const ManifestTaskSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string(),
  state: ManifestTaskStateEnum,
  dependsOn: z.array(z.string()),
  outputs: z.array(z.string()),
  owner: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(0),
  requiredCapabilities: z.array(z.string()).optional(),
  preferredRole: z.string().optional(),
});

export type ManifestTask = z.infer<typeof ManifestTaskSchema>;

export const ConstraintSchema = z.object({
  id: z.string(),
  type: ConstraintTypeEnum,
  description: z.string(),
});

export type Constraint = z.infer<typeof ConstraintSchema>;

export const ReviewRequirementSchema = z.object({
  id: z.string(),
  stage: ReviewStageEnum,
  mandatory: z.boolean(),
  passed: z.boolean().optional(),
  completedAt: z.string().datetime().optional(),
});

export type ReviewRequirement = z.infer<typeof ReviewRequirementSchema>;

export const ManifestMetadataSchema = z.object({
  requirement: z.string(),
  specification: z.string(),
  architecturePlan: z.string(),
});

export type ManifestMetadata = z.infer<typeof ManifestMetadataSchema>;

export const ExecutionManifestSchema = z.object({
  manifestId: z.string(),
  projectId: z.string(),
  version: z.string(),
  state: ManifestStateEnum,
  metadata: ManifestMetadataSchema,
  milestones: z.array(MilestoneSchema),
  tasks: z.array(ManifestTaskSchema),
  constraints: z.array(ConstraintSchema),
  reviewRequirements: z.array(ReviewRequirementSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ExecutionManifest = z.infer<typeof ExecutionManifestSchema>;
