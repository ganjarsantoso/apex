export interface SimilarityMatch {
  id: string;
  text: string;
  score: number;
  source: 'task' | 'manifest' | 'review' | 'lesson';
  projectId?: string;
  manifestId?: string;
}

export interface Document {
  id: string;
  text: string;
  source: 'task' | 'manifest' | 'review' | 'lesson';
  projectId?: string;
  manifestId?: string;
  tags?: string[];
  timestamp?: string;
}

export interface RelatedContext {
  taskId: string;
  milestone: { id: string; title: string } | null;
  siblings: Array<{ id: string; title: string; state: string }>;
  assignedAgent: { id: string; name: string } | null;
  blockers: Array<{ id: string; title: string }>;
  previousTasks: Array<{ id: string; title: string; state: string }>;
}

export interface KnowledgeEntry {
  id: string;
  summary: string;
  detail: string;
  tags: string[];
  source: 'manifest' | 'review' | 'manual' | 'retrospective' | 'pattern';
  projectId?: string;
  manifestId?: string;
  createdAt: string;
  consolidatedId?: string;
}

export type SourceRefType = 'lesson' | 'review' | 'pattern' | 'retrospective';

export interface SourceRef {
  id: string;
  type: SourceRefType;
}

export interface ConsolidatedEntry {
  id: string;
  canonicalText: string;
  sources: SourceRef[];
  projectIds: string[];
  manifestIds: string[];
  tags: string[];
  frequency: number;
  clusterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateResult {
  keptId: string;
  mergedId: string;
  similarity: number;
  method: 'keyword' | 'semantic';
}

export interface Cluster {
  id: string;
  label: string;
  memberIds: string[];
  size: number;
  avgScore: number;
}

export interface ConsolidationConfig {
  enabled: boolean;
  autoConsolidateOnIngest?: boolean;
  keywordThreshold?: number;
  semanticThreshold?: number;
}

export interface ConsolidationReport {
  totalEntries: number;
  duplicatesFound: number;
  clustersCreated: number;
  consolidatedCreated: number;
  methods: string[];
}

export type FeedbackReason = 'outdated' | 'incorrect' | 'duplicate' | 'unsafe' | 'irrelevant';

export interface LessonFeedback {
  id: string;
  targetId: string;
  sourceLessonId?: string;
  helpful: boolean;
  rating: 1 | 2 | 3 | 4 | 5;
  reason?: FeedbackReason;
  comment?: string;
  userId: string;
  createdAt: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  adjustedRating: number;
  helpfulCount: number;
  reasonCounts: Partial<Record<FeedbackReason, number>>;
}

export interface FeedbackConfig {
  enabled: boolean;
  suppressionThreshold?: number;
  minConfidenceVotes?: number;
  recencyWeightDays?: number;
}

export interface RankedEntry {
  id: string;
  entry: ConsolidatedEntry;
  rankScore: number;
  adjustedRating: number;
  rawAverageRating: number;
  feedbackCount: number;
  helpfulCount: number;
  topNegativeReasons: Array<{ reason: FeedbackReason; count: number }>;
}

export interface PatternStats {
  usageCount: number;
  averageRating: number;
  helpfulCount: number;
}

export interface ProjectPattern {
  id: string;
  name: string;
  triggerKeywords: string[];
  lessons: string[];
  recommendedTasks: string[];
  antiPatterns: string[];
  stats?: PatternStats;
}
