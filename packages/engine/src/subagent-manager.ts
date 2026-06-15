import { Task } from '@apex/types';
import { generateId } from '@apex/shared';

export interface SubagentTask {
  id: string;
  taskId: string;
  status: 'PENDING' | 'IMPLEMENTING' | 'TESTING' | 'DONE' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
}

export class SubagentManager {
  private subagents: Map<string, SubagentTask> = new Map();

  dispatch(task: Task, tddEnabled: boolean): SubagentTask {
    const subagent: SubagentTask = {
      id: `SA-${generateId()}`,
      taskId: task.id,
      status: 'PENDING',
    };

    this.subagents.set(subagent.id, subagent);
    return subagent;
  }

  getStatus(subagentId: string): SubagentTask | undefined {
    return this.subagents.get(subagentId);
  }

  getAllActive(): SubagentTask[] {
    return Array.from(this.subagents.values()).filter(
      (s) => s.status !== 'DONE' && s.status !== 'FAILED',
    );
  }
}
