import type Database from 'better-sqlite3';
import { AgentAssignment, AssignmentStatus } from '../schema.js';

export class AssignmentStore {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  save(assignment: AgentAssignment): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO assignments
        (assignment_id, task_id, agent_id, manifest_id, status, created_at, started_at, completed_at,
         correlation_id, parent_assignment_id, resolved_model)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assignment.assignmentId,
      assignment.taskId,
      assignment.agentId,
      assignment.manifestId,
      assignment.status,
      assignment.createdAt,
      assignment.startedAt ?? null,
      assignment.completedAt ?? null,
      assignment.correlationId ?? null,
      assignment.parentAssignmentId ?? null,
      assignment.resolvedModel ?? null,
    );
  }

  load(assignmentId: string): AgentAssignment | null {
    const row = this.db.prepare('SELECT * FROM assignments WHERE assignment_id = ?')
      .get(assignmentId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToAssignment(row);
  }

  getByManifest(manifestId: string): AgentAssignment[] {
    const rows = this.db.prepare(
      'SELECT * FROM assignments WHERE manifest_id = ? ORDER BY created_at'
    ).all(manifestId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.rowToAssignment(r));
  }

  getByAgent(agentId: string): AgentAssignment[] {
    const rows = this.db.prepare(
      'SELECT * FROM assignments WHERE agent_id = ? ORDER BY created_at DESC'
    ).all(agentId) as Array<Record<string, unknown>>;
    return rows.map((r) => this.rowToAssignment(r));
  }

  listActive(): AgentAssignment[] {
    const rows = this.db.prepare(
      "SELECT * FROM assignments WHERE status IN ('PENDING', 'ASSIGNED', 'ACTIVE') ORDER BY created_at"
    ).all() as Array<Record<string, unknown>>;
    return rows.map((r) => this.rowToAssignment(r));
  }

  updateStatus(assignmentId: string, status: AssignmentStatus): void {
    const updates: string[] = ['status = ?'];
    const params: unknown[] = [status];

    if (status === 'ACTIVE') {
      updates.push('started_at = ?');
      params.push(new Date().toISOString());
    }
    if (status === 'COMPLETE' || status === 'FAILED' || status === 'CANCELLED') {
      updates.push('completed_at = ?');
      params.push(new Date().toISOString());
    }

    params.push(assignmentId);
    this.db.prepare(`UPDATE assignments SET ${updates.join(', ')} WHERE assignment_id = ?`).run(...params);
  }

  delete(assignmentId: string): void {
    this.db.prepare('DELETE FROM assignments WHERE assignment_id = ?').run(assignmentId);
  }

  private rowToAssignment(row: Record<string, unknown>): AgentAssignment {
    return {
      assignmentId: row.assignment_id as string,
      taskId: row.task_id as string,
      agentId: row.agent_id as string,
      manifestId: row.manifest_id as string,
      status: row.status as AssignmentStatus,
      createdAt: row.created_at as string,
      startedAt: row.started_at as string | undefined,
      completedAt: row.completed_at as string | undefined,
      correlationId: row.correlation_id as string | undefined,
      parentAssignmentId: row.parent_assignment_id as string | undefined,
      resolvedModel: row.resolved_model as string | undefined,
    };
  }
}
