import Database from 'better-sqlite3';
import type { VectorRecord, VectorSearchResult, ArtifactType } from '../types.js';
import { VectorStore, SearchFilter, cosineSimilarity, float32ArrayToBuffer, bufferToFloat32Array, filterAndRank } from './types.js';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS vectors (
    id TEXT PRIMARY KEY,
    artifact_type TEXT NOT NULL,
    vector BLOB NOT NULL,
    content TEXT NOT NULL,
    project_id TEXT,
    manifest_id TEXT,
    tags TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vectors_artifact_type ON vectors(artifact_type);
  CREATE INDEX IF NOT EXISTS idx_vectors_project ON vectors(project_id);
`;

export class SQLiteVectorStore implements VectorStore {
  private db: Database.Database;
  private dims = 0;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? ':memory:';
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(SCHEMA_SQL);
  }

  store(record: VectorRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, artifact_type, vector, content, project_id, manifest_id, tags, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.artifactType,
      float32ArrayToBuffer(record.vector),
      record.content,
      record.metadata.projectId ?? null,
      record.metadata.manifestId ?? null,
      record.metadata.tags ? JSON.stringify(record.metadata.tags) : null,
      JSON.stringify(record.metadata),
      record.metadata.timestamp ?? new Date().toISOString(),
    );

    if (record.vector.length > this.dims) {
      this.dims = record.vector.length;
    }
  }

  search(vector: number[], topK: number, filter?: SearchFilter): VectorSearchResult[] {
    return this.searchInternal(vector, topK, undefined, filter);
  }

  searchByType(vector: number[], topK: number, artifactType: string, filter?: SearchFilter): VectorSearchResult[] {
    return this.searchInternal(vector, topK, artifactType, filter);
  }

  private recordsFromDb(artifactType?: string): VectorRecord[] {
    let sql = 'SELECT id, artifact_type, vector, content, project_id, manifest_id, tags, metadata FROM vectors';
    const params: unknown[] = [];

    if (artifactType) {
      sql += ' WHERE artifact_type = ?';
      params.push(artifactType);
    }

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      artifact_type: string;
      vector: Buffer;
      content: string;
      project_id: string | null;
      manifest_id: string | null;
      tags: string | null;
      metadata: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      vector: bufferToFloat32Array(row.vector),
      artifactType: row.artifact_type as ArtifactType,
      content: row.content,
      metadata: JSON.parse(row.metadata),
    }));
  }

  private searchInternal(vector: number[], topK: number, artifactType?: string, filter?: SearchFilter): VectorSearchResult[] {
    const records = this.recordsFromDb(artifactType);
    return filterAndRank(records, vector, topK, filter);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM vectors WHERE id = ?').run(id);
  }

  clear(): void {
    this.db.exec('DELETE FROM vectors');
  }

  stats(): { vectors: number; dimensions: number } {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM vectors').get() as { count: number };
    return { vectors: row.count, dimensions: this.dims };
  }

  close(): void {
    this.db.close();
  }
}
