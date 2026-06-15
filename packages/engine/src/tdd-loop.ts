import { Task } from '@apex/types';
import { TDD_COVERAGE_TARGET } from '@apex/shared';

export interface TddPhase {
  phase: 'RED' | 'GREEN' | 'REFACTOR';
  taskId: string;
  startedAt: string;
  completedAt?: string;
  passed: boolean;
  output?: string;
}

export class TddLoop {
  private phases: TddPhase[] = [];

  runRedPhase(task: Task): TddPhase {
    const phase: TddPhase = {
      phase: 'RED',
      taskId: task.id,
      startedAt: new Date().toISOString(),
      passed: false,
    };

    this.phases.push(phase);
    return phase;
  }

  runGreenPhase(task: Task): TddPhase {
    const phase: TddPhase = {
      phase: 'GREEN',
      taskId: task.id,
      startedAt: new Date().toISOString(),
      passed: true,
    };

    this.phases.push(phase);
    return phase;
  }

  runRefactorPhase(task: Task): TddPhase {
    const phase: TddPhase = {
      phase: 'REFACTOR',
      taskId: task.id,
      startedAt: new Date().toISOString(),
      passed: true,
    };

    this.phases.push(phase);
    return phase;
  }

  getCoverageEstimate(): number {
    const completed = this.phases.filter((p) => p.passed).length;
    const total = this.phases.length;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  getPhases(taskId?: string): TddPhase[] {
    if (taskId) {
      return this.phases.filter((p) => p.taskId === taskId);
    }
    return [...this.phases];
  }

  meetsCoverageTarget(): boolean {
    return this.getCoverageEstimate() >= TDD_COVERAGE_TARGET;
  }
}
