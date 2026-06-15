import { generateId } from '@apex/shared';
import type { KnowledgeEntry } from './types.js';
import type { LessonProvider } from './providers.js';

export class LessonsStore implements LessonProvider {
  private entries: Map<string, KnowledgeEntry> = new Map();

  addEntry(entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>): KnowledgeEntry {
    const created: KnowledgeEntry = {
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.entries.set(created.id, created);
    return created;
  }

  getEntry(id: string): KnowledgeEntry | undefined {
    return this.entries.get(id);
  }

  getLessons(topic: string): KnowledgeEntry[] {
    const lower = topic.toLowerCase();
    const keywords = lower.split(/\s+/).filter(t => t.length > 2);
    return Array.from(this.entries.values()).filter(e => {
      if (e.tags.some(t => lower.includes(t.toLowerCase()))) return true;
      return keywords.some(k => e.summary.toLowerCase().includes(k));
    });
  }

  findByTag(tag: string): KnowledgeEntry[] {
    const lower = tag.toLowerCase();
    return Array.from(this.entries.values()).filter(e =>
      e.tags.some(t => t.toLowerCase() === lower),
    );
  }

  findByProject(projectId: string): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(e => e.projectId === projectId);
  }

  findByIds(ids: string[]): KnowledgeEntry[] {
    return ids.map(id => this.entries.get(id)).filter(Boolean) as KnowledgeEntry[];
  }

  updateConsolidatedRef(entryId: string, consolidatedId: string): void {
    const entry = this.entries.get(entryId);
    if (entry) {
      entry.consolidatedId = consolidatedId;
    }
  }

  all(): KnowledgeEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
