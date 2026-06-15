import { ProjectSpec, TaskGraph, ExecutionPlan, ExecutionPlanSchema } from '@apex/types';
import { formatTimestamp } from '@apex/shared';
import { PlanValidator } from './validator.js';

export interface CompilationInput {
  spec: ProjectSpec;
  taskGraph: TaskGraph;
  planFilePath: string;
  specFilePath: string;
  worktree?: string;
  tdd?: boolean;
  securityScan?: boolean;
}

export class PlanCompiler {
  private validator: PlanValidator;

  constructor() {
    this.validator = new PlanValidator();
  }

  compile(input: CompilationInput): ExecutionPlan {
    const executionPlan: ExecutionPlan = {
      version: '1.0.0',
      compiledAt: formatTimestamp(),
      state: 'COMPILED',
      profile: 'execution',
      spec: input.specFilePath,
      plan: input.planFilePath,
      tdd: input.tdd ?? true,
      securityScan: input.securityScan ?? true,
      worktree: input.worktree ?? `feature/${input.spec.topic.toLowerCase().replace(/\s+/g, '-')}`,
      tasks: input.taskGraph.tasks.map((task) => ({
        ...task,
        status: 'PENDING',
      })),
    };

    const validation = this.validator.validate(executionPlan);
    if (!validation.valid) {
      throw new Error(`Plan validation failed: ${validation.errors.join(', ')}`);
    }

    return executionPlan;
  }
}
