import type Database from 'better-sqlite3';

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS manifests (
      manifest_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      version TEXT NOT NULL,
      state TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      milestones_json TEXT NOT NULL,
      constraints_json TEXT NOT NULL,
      review_requirements_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      manifest_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      state TEXT NOT NULL,
      depends_on_json TEXT NOT NULL,
      outputs_json TEXT NOT NULL,
      owner TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      required_capabilities_json TEXT,
      preferred_role TEXT,
      FOREIGN KEY (manifest_id) REFERENCES manifests(manifest_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS constraints (
      id TEXT PRIMARY KEY,
      manifest_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY (manifest_id) REFERENCES manifests(manifest_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      manifest_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      mandatory INTEGER NOT NULL DEFAULT 1,
      passed INTEGER,
      completed_at TEXT,
      FOREIGN KEY (manifest_id) REFERENCES manifests(manifest_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_manifest ON tasks(manifest_id);
    CREATE INDEX IF NOT EXISTS idx_constraints_manifest ON constraints(manifest_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_manifest ON reviews(manifest_id);
  `);
}
