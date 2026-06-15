import { Task, ExecutionPlan } from '@apex/types';
import { ACTIVE_MEMORY_K_TOKENS } from '@apex/shared';

export interface ActiveMemoryState {
  currentTask: Task | null;
  currentFile: string | null;
  lastTestOutput: string | null;
  tokenBudget: number;
  usedTokens: number;
}

export class ActiveMemory {
  private state: ActiveMemoryState = {
    currentTask: null,
    currentFile: null,
    lastTestOutput: null,
    tokenBudget: ACTIVE_MEMORY_K_TOKENS * 1000,
    usedTokens: 0,
  };

  setCurrentTask(task: Task): void {
    this.state.currentTask = task;
  }

  setCurrentFile(file: string): void {
    this.state.currentFile = file;
  }

  setTestOutput(output: string): void {
    this.state.lastTestOutput = output;
  }

  getState(): ActiveMemoryState {
    return { ...this.state };
  }

  isOverBudget(): boolean {
    return this.state.usedTokens >= this.state.tokenBudget;
  }

  reset(): void {
    this.state = {
      currentTask: null,
      currentFile: null,
      lastTestOutput: null,
      tokenBudget: ACTIVE_MEMORY_K_TOKENS * 1000,
      usedTokens: 0,
    };
  }
}
