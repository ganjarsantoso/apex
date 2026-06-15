import type Database from 'better-sqlite3';

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      agent_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IDLE',
      enabled INTEGER NOT NULL DEFAULT 1,
      capabilities_json TEXT NOT NULL,
      preferred_profile TEXT NOT NULL DEFAULT 'interactive',
      preferred_model TEXT NOT NULL DEFAULT 'default',
      load_factor REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
      assignment_id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      manifest_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      correlation_id TEXT,
      parent_assignment_id TEXT,
      resolved_model TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_agent ON assignments(agent_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_manifest ON assignments(manifest_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
  `);
}
