import { TOKEN_BUDGETS } from './constants.js';

export interface TokenUsage {
  phase: string;
  allocated: number;
  used: number;
  percentage: number;
}

export function calculatePhaseBudget(phase: string): number {
  const key = phase.toUpperCase() as keyof typeof TOKEN_BUDGETS;
  return TOKEN_BUDGETS[key] ?? 2000;
}

export function estimateTokenUsage(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateContextReduction(
  superpowersTokens: number,
  eccTokens: number,
  offTokens: number,
): number {
  const combined = superpowersTokens + eccTokens;
  if (combined === 0) return 0;
  return Math.round(((combined - offTokens) / combined) * 100);
}
