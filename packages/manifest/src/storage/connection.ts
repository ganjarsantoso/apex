import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getConnection(dbPath?: string): Database.Database {
  if (db) return db;

  const resolvedPath = dbPath ?? path.join(process.cwd(), '.apex', 'manifest.db');
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function closeConnection(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getMemoryConnection(): Database.Database {
  const memDb = new Database(':memory:');
  memDb.pragma('foreign_keys = ON');
  return memDb;
}
