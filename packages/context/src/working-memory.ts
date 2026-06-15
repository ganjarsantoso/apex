import { Task } from '@apex/types';
import { WORKING_MEMORY_K_TOKENS } from '@apex/shared';
import type { GraphStore } from '@apex/memory-graph';

export interface WorkingMemoryState {
  currentMilestone: string | null;
  taskGraph: Task[];
  unresolvedBlockers: string[];
  tokenBudget: number;
  usedTokens: number;
}

export class WorkingMemory {
  private state: WorkingMemoryState = {
    currentMilestone: null,
    taskGraph: [],
    unresolvedBlockers: [],
    tokenBudget: WORKING_MEMORY_K_TOKENS * 1000,
    usedTokens: 0,
  };

  private _graphStore: GraphStore | undefined;

  attachGraphStore(store: GraphStore): void {
    this._graphStore = store;
  }

  get graphStore(): GraphStore | undefined {
    return this._graphStore;
  }

  setMilestone(milestone: string): void {
    this.state.currentMilestone = milestone;
  }

  setTaskGraph(tasks: Task[]): void {
    this.state.taskGraph = [...tasks];
  }

  addBlocker(blocker: string): void {
    if (!this.state.unresolvedBlockers.includes(blocker)) {
      this.state.unresolvedBlockers.push(blocker);
    }
  }

  resolveBlocker(blocker: string): void {
    this.state.unresolvedBlockers = this.state.unresolvedBlockers.filter(
      (b) => b !== blocker,
    );
  }

  hydrateFromGraph(manifestId: string): void {
    if (!this._graphStore) return;

    const snapshot = this._graphStore.getSubgraph(manifestId);

    const taskEntities = snapshot.entities.filter(e => e.kind === 'TASK');
    if (taskEntities.length > 0) {
      this.state.taskGraph = taskEntities.map(e => {
        const deps = snapshot.relationships
          .filter(r => r.sourceId === e.id && r.type === 'DEPENDS_ON')
          .map(r => r.targetId);
        return {
          id: (e.properties.taskId as string) ?? e.id,
          title: (e.properties.title as string) ?? 'Unknown',
          objective: (e.properties.objective as string) ?? '',
          dependencies: deps,
          files: { create: [], modify: [], test: [] },
          steps: [],
          acceptanceCriteria: [],
          status: (e.properties.state as 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'FAILED') ?? undefined,
        } as unknown as Task;
      });
    }

    const blockerRels = snapshot.relationships.filter(r => r.type === 'BLOCKS');
    for (const rel of blockerRels) {
      const targetEntity = snapshot.entities.find(e => e.id === rel.targetId);
      if (targetEntity && targetEntity.properties.title) {
        this.addBlocker(targetEntity.properties.title as string);
      }
    }
  }

  getState(): WorkingMemoryState {
    return { ...this.state };
  }

  isOverBudget(): boolean {
    return this.state.usedTokens >= this.state.tokenBudget;
  }

  reset(): void {
    this.state = {
      currentMilestone: null,
      taskGraph: [],
      unresolvedBlockers: [],
      tokenBudget: WORKING_MEMORY_K_TOKENS * 1000,
      usedTokens: 0,
    };
    this._graphStore = undefined;
  }
}
