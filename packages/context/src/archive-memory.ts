import { ARCHIVE_MEMORY_K_TOKENS } from '@apex/shared';

export interface ArchiveEntry {
  id: string;
  type: 'completed_task' | 'resolved_decision' | 'phase_summary';
  summary: string;
  timestamp: string;
  tokens: number;
}

export class ArchiveMemory {
  private entries: ArchiveEntry[] = [];
  private tokenBudget = ARCHIVE_MEMORY_K_TOKENS * 1000;
  private usedTokens = 0;

  archive(entry: Omit<ArchiveEntry, 'id'>): void {
    this.entries.push({
      ...entry,
      id: `ARCHIVE-${this.entries.length + 1}`,
    });
    this.usedTokens += entry.tokens ?? 0;
  }

  getRecent(count: number = 5): ArchiveEntry[] {
    return this.entries.slice(-count);
  }

  getAll(): ArchiveEntry[] {
    return [...this.entries];
  }

  isOverBudget(): boolean {
    return this.usedTokens >= this.tokenBudget;
  }

  getUsage(): { entries: number; tokens: number; budget: number } {
    return {
      entries: this.entries.length,
      tokens: this.usedTokens,
      budget: this.tokenBudget,
    };
  }

  reset(): void {
    this.entries = [];
    this.usedTokens = 0;
  }
}
