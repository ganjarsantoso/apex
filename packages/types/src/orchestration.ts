import { z } from 'zod';
import { PhaseEnum } from './state.js';
import { RuntimeProfileEnum } from './profile.js';

export interface LifecycleEvent {
  phase: string;
  action: string;
  timestamp: string;
  payload?: unknown;
}

export const orchestratorState = z.object({
  sessionId: z.string(),
  phase: PhaseEnum,
  profile: RuntimeProfileEnum,
  activeExecutionPlan: z.string().nullable(),
  lastEvent: z.string().nullable(),
});
