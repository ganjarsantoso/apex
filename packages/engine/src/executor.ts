import { ExecutionPlan, Task, Phase } from '@apex/types';
import { formatTimestamp, deepClone } from '@apex/shared';
import { SubagentManager } from './subagent-manager.js';
import { TddLoop } from './tdd-loop.js';

export interface ExecutionResult {
  planId: string;
  status: 'RUNNING' | 'COMPLETE' | 'FAILED' | 'BLOCKED';
  tasksCompleted: number;
  tasksFailed: number;
  tasksBlocked: number;
  totalTasks: number;
  startedAt: string;
  completedAt?: string;
  errors: string[];
}

export class Executor {
  private subagentManager: SubagentManager;
  private tddLoop: TddLoop;
  private results: Map<string, ExecutionResult> = new Map();

  constructor() {
    this.subagentManager = new SubagentManager();
    this.tddLoop = new TddLoop();
  }

  async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      planId: plan.planVersion ?? plan.version,
      status: 'RUNNING',
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksBlocked: 0,
      totalTasks: plan.tasks.length,
      startedAt: formatTimestamp(),
      errors: [],
    };

    this.results.set(result.planId, result);

    const orderedTasks = this.topologicalSort(plan.tasks);

    for (const task of orderedTasks) {
      try {
        await this.executeTask(task, plan);
        result.tasksCompleted++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Task ${task.id} failed: ${message}`);
        result.tasksFailed++;
      }

      this.results.set(result.planId, result);
    }

    result.status = result.tasksFailed > 0 ? 'FAILED' : 'COMPLETE';
    result.completedAt = formatTimestamp();
    this.results.set(result.planId, result);

    return result;
  }

  private async executeTask(task: Task, plan: ExecutionPlan): Promise<void> {
    this.tddLoop.runRedPhase(task);
    this.subagentManager.dispatch(task, plan.tdd);
    this.tddLoop.runGreenPhase(task);
    this.tddLoop.runRefactorPhase(task);
  }

  private topologicalSort(tasks: Task[]): Task[] {
    const sorted: Task[] = [];
    const visited = new Set<string>();

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        for (const dep of task.dependencies) {
          visit(dep);
        }
        sorted.push(task);
      }
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return sorted;
  }

  getResult(planId: string): ExecutionResult | undefined {
    return this.results.get(planId);
  }
}
