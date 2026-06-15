import type { ExecutionManifest, ManifestTask } from '@apex/manifest';
import type { Retrospective, RetrospectiveEvents } from './types.js';

function getTaskState(task: ManifestTask): string {
  return task.state;
}

export class RetrospectiveTemplate {
  build(input: {
    manifest: ExecutionManifest;
    events: RetrospectiveEvents;
  }): Retrospective {
    const { manifest, events } = input;
    const wentWell = this.buildWentWell(manifest, events);
    const failed = this.buildFailed(manifest, events);
    const repeat = this.buildRepeat(manifest, events);
    const avoid = this.buildAvoid(manifest, events);
    const recommendations = this.buildRecommendations(manifest, events);

    const entries = wentWell.length + failed.length + repeat.length + avoid.length + recommendations.length;
    const confidence = entries > 0 ? Math.min(0.3 + entries * 0.05, 1.0) : 0.1;

    return {
      manifestId: manifest.manifestId,
      projectId: manifest.projectId,
      wentWell,
      failed,
      repeat,
      avoid,
      recommendations,
      confidence,
    };
  }

  private buildWentWell(manifest: ExecutionManifest, events: RetrospectiveEvents): string[] {
    const items: string[] = [];
    const completedTasks = manifest.tasks.filter(t => getTaskState(t) === 'COMPLETE');
    if (completedTasks.length > 0) {
      items.push(`Completed ${completedTasks.length} task(s) successfully`);
      for (const task of completedTasks.slice(0, 5)) {
        items.push(`Task "${task.title}" completed successfully`);
      }
    }
    const reviewPassedCount = events.reviewPassed.length;
    if (reviewPassedCount > 0) {
      items.push(`Passed ${reviewPassedCount} review(s)`);
    }
    if (items.length === 0) {
      items.push('No tasks were completed');
    }
    return items;
  }

  private buildFailed(manifest: ExecutionManifest, events: RetrospectiveEvents): string[] {
    const items: string[] = [];
    const failedTasks = manifest.tasks.filter(t => getTaskState(t) === 'FAILED');
    for (const task of failedTasks) {
      const reason = events.taskFailed.find(e => e.taskId === task.taskId)?.reason;
      items.push(`Task "${task.title}" failed${reason ? `: ${reason}` : ''}`);
    }
    for (const review of events.reviewFailed) {
      items.push(`Review "${review.milestone}" failed with ${review.issues} issue(s)`);
    }
    for (const issue of events.securityIssues) {
      items.push(`Security issue detected: ${issue.issue} (${issue.severity})`);
    }
    for (const violation of events.policyViolations) {
      items.push(`Policy violation: ${violation.operation} blocked by ${violation.policy}`);
    }
    if (items.length === 0 && failedTasks.length === 0) {
      return [];
    }
    return items;
  }

  private buildRepeat(manifest: ExecutionManifest, events: RetrospectiveEvents): string[] {
    const items: string[] = [];
    if (manifest.tasks.length > 0) {
      items.push(`Follow the task decomposition pattern for future projects`);
    }
    if (events.reviewPassed.length > 0) {
      items.push('Continue using structured review gates before delivery');
    }
    return items;
  }

  private buildAvoid(manifest: ExecutionManifest, events: RetrospectiveEvents): string[] {
    const items: string[] = [];
    const hasRollback = events.phaseTransitions.some(t => t.to === 'ROLLBACK');
    if (hasRollback) {
      items.push('Avoid changes that require rollback — validate before deployment');
    }
    for (const issue of events.securityIssues) {
      items.push(`Avoid ${issue.issue} — address ${issue.severity.toLowerCase()} severity items earlier`);
    }
    for (const violation of events.policyViolations) {
      items.push(`Avoid ${violation.operation} — use approved tools only`);
    }
    for (const review of events.reviewFailed) {
      items.push(`Avoid ${review.issues} issue(s) in "${review.milestone}" — fix before gate`);
    }
    return items;
  }

  private buildRecommendations(manifest: ExecutionManifest, events: RetrospectiveEvents): string[] {
    const items: string[] = [];
    const failedTasks = manifest.tasks.filter(t => getTaskState(t) === 'FAILED');
    if (failedTasks.length > 0) {
      items.push(`Investigate root cause of ${failedTasks.length} failed task(s)`);
    }
    const hasRollback = events.phaseTransitions.some(t => t.to === 'ROLLBACK');
    if (hasRollback) {
      items.push('Add pre-deployment validation to prevent rollbacks');
    }
    if (events.securityIssues.length > 0) {
      items.push('Integrate security scanning earlier in the pipeline');
    }
    if (events.reviewFailed.length > 0) {
      items.push('Schedule reviews incrementally rather than at end');
    }
    if (items.length === 0) {
      items.push('Continue with current development practices');
    }
    return items;
  }
}
