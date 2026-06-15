import { ExecutionManifest, ExecutionManifestSchema } from './schema.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ManifestValidator {
  validate(manifest: ExecutionManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const schemaResult = ExecutionManifestSchema.safeParse(manifest);
    if (!schemaResult.success) {
      errors.push(...schemaResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
      return { valid: false, errors, warnings };
    }

    if (manifest.tasks.length === 0) {
      errors.push('Manifest must contain at least one task');
    }

    const taskIds = new Set(manifest.tasks.map((t) => t.taskId));
    for (const task of manifest.tasks) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep)) {
          errors.push(`Task ${task.taskId} depends on unknown task ${dep}`);
        }
      }
    }

    for (const milestone of manifest.milestones) {
      for (const tid of milestone.taskIds) {
        if (!taskIds.has(tid)) {
          errors.push(`Milestone ${milestone.id} references unknown task ${tid}`);
        }
      }
    }

    if (manifest.milestones.length === 0) {
      warnings.push('Manifest has no milestones defined');
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
