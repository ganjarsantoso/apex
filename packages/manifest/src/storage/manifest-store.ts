import type Database from 'better-sqlite3';
import { ManifestState } from '@apex/types';
import {
  ExecutionManifest,
  Milestone,
  Constraint,
  ReviewRequirement,
} from '../schema.js';

function parseJsonField<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

export class ManifestStore {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  save(manifest: ExecutionManifest): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO manifests
        (manifest_id, project_id, version, state, metadata_json, milestones_json,
         constraints_json, review_requirements_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      manifest.manifestId,
      manifest.projectId,
      manifest.version,
      manifest.state,
      JSON.stringify(manifest.metadata),
      JSON.stringify(manifest.milestones),
      JSON.stringify(manifest.constraints),
      JSON.stringify(manifest.reviewRequirements),
      manifest.createdAt,
      manifest.updatedAt,
    );

    const taskStmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks
        (task_id, manifest_id, title, description, state, depends_on_json, outputs_json, owner, priority,
         required_capabilities_json, preferred_role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const task of manifest.tasks) {
      taskStmt.run(
        task.taskId,
        manifest.manifestId,
        task.title,
        task.description,
        task.state,
        JSON.stringify(task.dependsOn),
        JSON.stringify(task.outputs),
        task.owner ?? null,
        task.priority,
        task.requiredCapabilities ? JSON.stringify(task.requiredCapabilities) : null,
        task.preferredRole ?? null,
      );
    }

    const constraintStmt = this.db.prepare(`
      INSERT OR REPLACE INTO constraints (id, manifest_id, type, description)
      VALUES (?, ?, ?, ?)
    `);

    for (const c of manifest.constraints) {
      constraintStmt.run(c.id, manifest.manifestId, c.type, c.description);
    }

    const reviewStmt = this.db.prepare(`
      INSERT OR REPLACE INTO reviews (id, manifest_id, stage, mandatory, passed, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const r of manifest.reviewRequirements) {
      reviewStmt.run(
        r.id,
        manifest.manifestId,
        r.stage,
        r.mandatory ? 1 : 0,
        r.passed === undefined ? null : r.passed ? 1 : 0,
        r.completedAt ?? null,
      );
    }
  }

  load(manifestId: string): ExecutionManifest | null {
    const row = this.db.prepare(
      'SELECT * FROM manifests WHERE manifest_id = ?'
    ).get(manifestId) as Record<string, unknown> | undefined;

    if (!row) return null;

    const tasks = this.db.prepare(
      'SELECT * FROM tasks WHERE manifest_id = ? ORDER BY priority DESC'
    ).all(manifestId) as Array<Record<string, unknown>>;

    const constraints = this.db.prepare(
      'SELECT * FROM constraints WHERE manifest_id = ?'
    ).all(manifestId) as Array<Record<string, unknown>>;

    const reviews = this.db.prepare(
      'SELECT * FROM reviews WHERE manifest_id = ?'
    ).all(manifestId) as Array<Record<string, unknown>>;

    return {
      manifestId: row.manifest_id as string,
      projectId: row.project_id as string,
      version: row.version as string,
      state: row.state as ManifestState,
      metadata: parseJsonField(row.metadata_json as string, { requirement: '', specification: '', architecturePlan: '' }),
      milestones: parseJsonField(row.milestones_json as string, [] as Milestone[]),
      constraints: constraints.map((c) => ({
        id: c.id as string,
        type: c.type as Constraint['type'],
        description: c.description as string,
      })),
      reviewRequirements: reviews.map((r) => ({
        id: r.id as string,
        stage: r.stage as ReviewRequirement['stage'],
        mandatory: Boolean(r.mandatory),
        passed: r.passed === null ? undefined : Boolean(r.passed),
        completedAt: r.completed_at as string | undefined,
      })),
      tasks: tasks.map((t) => {
        const task: Record<string, unknown> = {
          taskId: t.task_id as string,
          title: t.title as string,
          description: t.description as string,
          state: t.state as ExecutionManifest['tasks'][0]['state'],
          dependsOn: parseJsonField(t.depends_on_json as string, [] as string[]),
          outputs: parseJsonField(t.outputs_json as string, [] as string[]),
          owner: t.owner as string | undefined,
          priority: t.priority as number,
        };
        const caps = t.required_capabilities_json as string | null;
        if (caps) task.requiredCapabilities = JSON.parse(caps);
        if (t.preferred_role) task.preferredRole = t.preferred_role as string;
        return task as ExecutionManifest['tasks'][0];
      }),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  list(): Array<{ manifestId: string; projectId: string; state: string; createdAt: string }> {
    const rows = this.db.prepare(
      'SELECT manifest_id, project_id, state, created_at FROM manifests ORDER BY created_at DESC'
    ).all() as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      manifestId: r.manifest_id as string,
      projectId: r.project_id as string,
      state: r.state as string,
      createdAt: r.created_at as string,
    }));
  }

  updateState(manifestId: string, state: ManifestState): void {
    this.db.prepare(
      'UPDATE manifests SET state = ?, updated_at = ? WHERE manifest_id = ?'
    ).run(state, new Date().toISOString(), manifestId);
  }

  delete(manifestId: string): void {
    this.db.prepare('DELETE FROM manifests WHERE manifest_id = ?').run(manifestId);
  }
}
