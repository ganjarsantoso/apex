import { generateId } from '@apex/shared';
import type { ConsolidatedEntry } from './types.js';

export class ConsolidatedStore {
  private entries: Map<string, ConsolidatedEntry> = new Map();

  add(entry: Omit<ConsolidatedEntry, 'id' | 'createdAt' | 'updatedAt'>): ConsolidatedEntry {
    const created: ConsolidatedEntry = {
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.entries.set(created.id, created);
    return created;
  }

  get(id: string): ConsolidatedEntry | undefined {
    return this.entries.get(id);
  }

  findByProject(projectId: string): ConsolidatedEntry[] {
    return Array.from(this.entries.values()).filter(e => e.projectIds.includes(projectId));
  }

  findByTag(tag: string): ConsolidatedEntry[] {
    const lower = tag.toLowerCase();
    return Array.from(this.entries.values()).filter(e =>
      e.tags.some(t => t.toLowerCase() === lower),
    );
  }

  all(): ConsolidatedEntry[] {
    return Array.from(this.entries.values());
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  getStats(): { consolidated: number; clusters: number } {
    const clusters = new Set(
      Array.from(this.entries.values())
        .map(e => e.clusterId)
        .filter(Boolean),
    );
    return {
      consolidated: this.entries.size,
      clusters: clusters.size,
    };
  }
}
