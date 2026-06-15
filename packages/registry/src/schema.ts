import { z } from 'zod';

export const AgentRoleEnum = z.enum([
  'ORCHESTRATOR',
  'BRAIN',
  'PLANNER',
  'ENGINE',
  'CODE_REVIEWER',
  'SECURITY_REVIEWER',
  'CUSTOM',
]);

export type AgentRole = z.infer<typeof AgentRoleEnum>;

export const AgentStatusEnum = z.enum(['IDLE', 'BUSY', 'OFFLINE', 'ERROR']);

export type AgentStatus = z.infer<typeof AgentStatusEnum>;

export const AssignmentStatusEnum = z.enum([
  'PENDING',
  'ASSIGNED',
  'ACTIVE',
  'COMPLETE',
  'FAILED',
  'CANCELLED',
]);

export type AssignmentStatus = z.infer<typeof AssignmentStatusEnum>;

export const AgentCapabilitySchema = z.object({
  planning: z.boolean(),
  coding: z.boolean(),
  testing: z.boolean(),
  reviewing: z.boolean(),
  security: z.boolean(),
  orchestration: z.boolean(),
});

export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

export const AgentSpecSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  role: AgentRoleEnum,
  status: AgentStatusEnum.default('IDLE'),
  enabled: z.boolean().default(true),
  capabilities: AgentCapabilitySchema,
  preferredProfile: z.enum(['interactive', 'execution', 'review']).default('interactive'),
  preferredModel: z.string().default('default'),
  loadFactor: z.number().min(0).max(1).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AgentSpec = z.infer<typeof AgentSpecSchema>;

export const AgentAssignmentSchema = z.object({
  assignmentId: z.string(),
  taskId: z.string(),
  agentId: z.string(),
  manifestId: z.string(),
  status: AssignmentStatusEnum.default('PENDING'),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  correlationId: z.string().optional(),
  parentAssignmentId: z.string().optional(),
  resolvedModel: z.string().optional(),
});

export type AgentAssignment = z.infer<typeof AgentAssignmentSchema>;

export interface RegistryStats {
  total: number;
  idle: number;
  busy: number;
  offline: number;
  error: number;
}
