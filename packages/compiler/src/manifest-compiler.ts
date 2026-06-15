import { ExecutionPlan, ProjectSpec, ManifestState, ManifestTaskState } from '@apex/types';
import { formatTimestamp, generateId } from '@apex/shared';
import {
  ExecutionManifest,
  ManifestTask,
  Milestone,
  Constraint,
  ReviewRequirement,
} from '@apex/manifest';

export interface ManifestCompilationInput {
  executionPlan: ExecutionPlan;
  spec: ProjectSpec;
  projectId?: string;
}

export class ManifestCompiler {
  compile(input: ManifestCompilationInput): ExecutionManifest {
    const { executionPlan: plan, spec, projectId } = input;
    const now = formatTimestamp();
    const manifestId = `manifest_${generateId()}`;
    const pid = projectId ?? `project_${generateId()}`;

    const milestones = this.buildMilestones(plan, spec);
    const tasks = this.buildTasks(plan);
    const constraints = this.buildConstraints(plan, spec);
    const reviewRequirements = this.buildReviewRequirements(plan);

    const manifest: ExecutionManifest = {
      manifestId,
      projectId: pid,
      version: plan.version,
      state: 'DRAFT' as ManifestState,
      metadata: {
        requirement: spec.description.substring(0, 200),
        specification: spec.filePath,
        architecturePlan: plan.plan,
      },
      milestones,
      tasks,
      constraints,
      reviewRequirements,
      createdAt: now,
      updatedAt: now,
    };

    return manifest;
  }

  private buildMilestones(plan: ExecutionPlan, _spec: ProjectSpec): Milestone[] {
    return [{
      id: 'milestone_1',
      title: 'Core Implementation',
      description: 'Primary implementation tasks',
      taskIds: plan.tasks.map((t) => t.id),
    }];
  }

  private buildTasks(plan: ExecutionPlan): ManifestTask[] {
    const taskMap = new Map<string, { dependsOn: string[] }>();
    for (const task of plan.tasks) {
      taskMap.set(task.id, { dependsOn: [...task.dependencies] });
    }

    return plan.tasks.map((task, idx) => {
      const deps = taskMap.get(task.id)?.dependsOn ?? [];
      const state: ManifestTaskState = deps.length === 0 ? 'READY' : 'PENDING';

      return {
        taskId: task.id,
        title: task.title,
        description: task.objective,
        state,
        dependsOn: deps,
        outputs: [...(task.files.create ?? []), ...(task.files.modify ?? []), ...(task.files.test ?? [])],
        priority: idx < 3 ? 100 : 50,
      };
    });
  }

  private buildConstraints(plan: ExecutionPlan, spec: ProjectSpec): Constraint[] {
    const constraints: Constraint[] = [];
    let idx = 0;

    if (plan.securityScan) {
      constraints.push({
        id: `constraint_${++idx}`,
        type: 'SECURITY',
        description: 'Security scan required before completion',
      });
    }

    if (spec.constraints) {
      for (const c of spec.constraints) {
        constraints.push({
          id: `constraint_${++idx}`,
          type: 'COMPLIANCE',
          description: c,
        });
      }
    }

    return constraints;
  }

  private buildReviewRequirements(plan: ExecutionPlan): ReviewRequirement[] {
    return [
      { id: 'review_code', stage: 'CODE', mandatory: true },
      { id: 'review_security', stage: 'SECURITY', mandatory: plan.securityScan },
      { id: 'review_arch', stage: 'ARCHITECTURE', mandatory: false },
    ];
  }
}
