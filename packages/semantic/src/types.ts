export type ArtifactType =
  | 'lesson'
  | 'pattern'
  | 'retrospective'
  | 'manifest'
  | 'task'
  | 'review';

export interface ArtifactMetadata {
  projectId?: string;
  manifestId?: string;
  tags?: string[];
  timestamp?: string;
  taskTitle?: string;
  reviewPassed?: boolean;
  retrospectiveConfidence?: number;
  lessonScore?: number;
  patternTriggerKeywords?: string[];
  [key: string]: unknown;
}

export interface VectorRecord {
  id: string;
  vector: number[];
  artifactType: ArtifactType;
  content: string;
  metadata: ArtifactMetadata;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  artifactType: ArtifactType;
  content: string;
  metadata: ArtifactMetadata;
}

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
}
