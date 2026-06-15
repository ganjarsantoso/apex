import { z } from 'zod';

export const RuntimeProfileEnum = z.enum(['interactive', 'execution', 'review']);

export type RuntimeProfile = z.infer<typeof RuntimeProfileEnum>;

export const HookProfileEnum = z.enum(['minimal', 'standard', 'strict']);

export type HookProfile = z.infer<typeof HookProfileEnum>;

export const CapabilityProfileSchema = z.object({
  filesystem: z.object({
    read: z.boolean(),
    write: z.boolean(),
  }),
  shell: z.object({
    execute: z.boolean(),
  }),
  network: z.object({
    outbound: z.boolean(),
  }),
});

export type CapabilityProfile = z.infer<typeof CapabilityProfileSchema>;

export const RuntimeProfileConfigSchema = z.object({
  name: RuntimeProfileEnum,
  hooks: HookProfileEnum,
  skills: z.array(z.string()),
  blockedSkills: z.array(z.string()),
  interactiveAllowed: z.boolean(),
  autoExecute: z.boolean(),
  capabilities: CapabilityProfileSchema,
});

export type RuntimeProfileConfig = z.infer<typeof RuntimeProfileConfigSchema>;

export const PROFILES: Record<RuntimeProfile, RuntimeProfileConfig> = {
  interactive: {
    name: 'interactive',
    hooks: 'minimal',
    skills: ['brainstorming', 'writing-plans', 'apex-discovery'],
    blockedSkills: ['*'],
    interactiveAllowed: true,
    autoExecute: false,
    capabilities: {
      filesystem: { read: true, write: true },
      shell: { execute: false },
      network: { outbound: false },
    },
  },
  execution: {
    name: 'execution',
    hooks: 'minimal',
    skills: ['test-driven-development', 'using-git-worktrees'],
    blockedSkills: [
      'brainstorming',
      'writing-plans',
      'subagent-driven-development',
    ],
    interactiveAllowed: false,
    autoExecute: true,
    capabilities: {
      filesystem: { read: true, write: true },
      shell: { execute: true },
      network: { outbound: true },
    },
  },
  review: {
    name: 'review',
    hooks: 'standard',
    skills: [
      'requesting-code-review',
      'receiving-code-review',
      'verification-before-completion',
    ],
    blockedSkills: [
      'brainstorming',
      'writing-plans',
      'test-driven-development',
    ],
    interactiveAllowed: false,
    autoExecute: false,
    capabilities: {
      filesystem: { read: true, write: false },
      shell: { execute: true },
      network: { outbound: false },
    },
  },
};
