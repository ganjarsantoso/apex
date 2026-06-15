import { ExecutionPlan, ExecutionPlanSchema } from '@apex/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PlanValidator {
  validate(plan: ExecutionPlan): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const schemaResult = ExecutionPlanSchema.safeParse(plan);
    if (!schemaResult.success) {
      errors.push(...schemaResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
      return { valid: false, errors, warnings };
    }

    if (plan.tasks.length === 0) {
      errors.push('Execution plan must contain at least one task');
    }

    const taskIds = new Set(plan.tasks.map((t) => t.id));
    for (const task of plan.tasks) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep)) {
          errors.push(`Task ${task.id} depends on unknown task ${dep}`);
        }
      }

      if (task.steps.length === 0) {
        warnings.push(`Task ${task.id} has no steps defined`);
      }

      if (task.acceptanceCriteria.length === 0) {
        warnings.push(`Task ${task.id} has no acceptance criteria`);
      }

      if (!task.files.create?.length && !task.files.modify?.length && !task.files.test?.length) {
        warnings.push(`Task ${task.id} has no files defined`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
