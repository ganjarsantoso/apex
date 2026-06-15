import type { EventMap } from '@apex/events';

export type RetrospectiveEvent = 'wentWell' | 'failed' | 'repeat' | 'avoid' | 'recommendation';

export interface Retrospective {
  manifestId: string;
  projectId: string;
  wentWell: string[];
  failed: string[];
  repeat: string[];
  avoid: string[];
  recommendations: string[];
  confidence: number;
}

export type ImpactFlag =
  | 'rollback'
  | 'security_issue'
  | 'review_failure'
  | 'dependency_failure';

export interface LessonSummary {
  id: string;
  text: string;
  category: RetrospectiveEvent;
  impactFlags: ImpactFlag[];
  sourceManifestId: string;
  projectId?: string;
  frequency: number;
  confidence: number;
  score: number;
  normalized: string;
}

export interface ConsolidationGroup {
  normalized: string;
  variants: LessonSummary[];
  best: LessonSummary;
}

export interface RetrospectiveEvents {
  taskFailed: EventMap['TaskFailed'][];
  reviewFailed: EventMap['ReviewFailed'][];
  reviewPassed: EventMap['ReviewPassed'][];
  securityIssues: EventMap['SecurityIssueDetected'][];
  policyViolations: EventMap['PolicyViolationDetected'][];
  phaseTransitions: EventMap['PhaseTransitioned'][];
}
