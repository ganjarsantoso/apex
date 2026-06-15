import type Database from 'better-sqlite3';
import { AgentSpec, AgentStatus, AgentRole, AgentCapability } from '../schema.js';

export class AgentStore {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  save(agent: AgentSpec): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO agents
        (agent_id, name, role, status, enabled, capabilities_json,
         preferred_profile, preferred_model, load_factor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agent.agentId,
      agent.name,
      agent.role,
      agent.status,
      agent.enabled ? 1 : 0,
      JSON.stringify(agent.capabilities),
      agent.preferredProfile,
      agent.preferredModel,
      agent.loadFactor,
      agent.createdAt,
      agent.updatedAt,
    );
  }

  load(agentId: string): AgentSpec | null {
    const row = this.db.prepare('SELECT * FROM agents WHERE agent_id = ?')
      .get(agentId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToSpec(row);
  }

  list(): AgentSpec[] {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY name').all() as Array<Record<string, unknown>>;
    return rows.map((r) => this.rowToSpec(r));
  }

  updateStatus(agentId: string, status: AgentStatus): void {
    this.db.prepare('UPDATE agents SET status = ?, updated_at = ? WHERE agent_id = ?')
      .run(status, new Date().toISOString(), agentId);
  }

  updateLoadFactor(agentId: string, factor: number): void {
    this.db.prepare('UPDATE agents SET load_factor = ?, updated_at = ? WHERE agent_id = ?')
      .run(factor, new Date().toISOString(), agentId);
  }

  delete(agentId: string): void {
    this.db.prepare('DELETE FROM agents WHERE agent_id = ?').run(agentId);
  }

  private rowToSpec(row: Record<string, unknown>): AgentSpec {
    const capabilities = JSON.parse(row.capabilities_json as string) as AgentCapability;
    return {
      agentId: row.agent_id as string,
      name: row.name as string,
      role: row.role as AgentRole,
      status: row.status as AgentStatus,
      enabled: Boolean(row.enabled),
      capabilities,
      preferredProfile: row.preferred_profile as 'interactive' | 'execution' | 'review',
      preferredModel: row.preferred_model as string,
      loadFactor: row.load_factor as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
