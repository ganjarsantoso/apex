import { ActiveMemory } from './active-memory.js';
import { WorkingMemory } from './working-memory.js';
import { ArchiveMemory } from './archive-memory.js';
import { COMPRESSION_TRIGGER_TASK_COUNT, COMPRESSION_BLOCKED_DURATION_MS } from '@apex/shared';

export interface CompressionReport {
  compressed: boolean;
  archivedEntries: number;
  freedTokens: number;
  reason: string;
}

export class ContextCompressor {
  private activeMemory: ActiveMemory;
  private workingMemory: WorkingMemory;
  private archiveMemory: ArchiveMemory;
  private completedTasks: number = 0;

  constructor(
    active: ActiveMemory,
    working: WorkingMemory,
    archive: ArchiveMemory,
  ) {
    this.activeMemory = active;
    this.workingMemory = working;
    this.archiveMemory = archive;
  }

  checkAndCompress(): CompressionReport | null {
    if (this.shouldCompress()) {
      return this.compress('Task threshold reached');
    }
    return null;
  }

  recordTaskCompletion(): void {
    this.completedTasks++;
  }

  private shouldCompress(): boolean {
    return this.completedTasks >= COMPRESSION_TRIGGER_TASK_COUNT;
  }

  private compress(reason: string): CompressionReport {
    const entries = this.archiveMemory.getUsage();

    this.workingMemory.reset();
    this.completedTasks = 0;

    return {
      compressed: true,
      archivedEntries: entries.entries,
      freedTokens: entries.tokens,
      reason,
    };
  }

  summarizeContext(): string {
    const active = this.activeMemory.getState();
    const working = this.workingMemory.getState();
    const archive = this.archiveMemory.getUsage();

    return [
      `Active: ${active.currentTask ? `Task ${active.currentTask.id}` : 'none'}`,
      `Working: ${working.currentMilestone ?? 'no milestone'}`,
      `Blockers: ${working.unresolvedBlockers.length}`,
      `Archived: ${archive.entries} entries (${archive.tokens} tokens)`,
      `Completed tasks: ${this.completedTasks}`,
    ].join('\n');
  }
}
