import { Phase, RuntimeProfile } from '@apex/types';

export interface BaseEvent {
  version: '1.0';
  eventId: string;
  correlationId: string;
  timestamp: string;
  source: string;
}

export interface EventEnvelope<T = Record<string, unknown>> {
  metadata: {
    version: string;
    timestamp: string;
    correlationId: string;
    eventId: string;
    source: string;
  };
  payload: T;
}

export interface EventMap {
  PhaseTransitioned: {
    projectId?: string;
    phaseId: string;
    from: Phase;
    to: Phase;
    trigger: string;
  } & BaseEvent;

  ProfileSwitched: {
    from: RuntimeProfile;
    to: RuntimeProfile;
  } & BaseEvent;

  TaskQueued: {
    taskId: string;
  } & BaseEvent;

  TaskStarted: {
    taskId: string;
  } & BaseEvent;

  TaskCompleted: {
    taskId: string;
    result: string;
  } & BaseEvent;

  TaskFailed: {
    taskId: string;
    reason: string;
  } & BaseEvent;

  ReviewPassed: {
    milestone: string;
  } & BaseEvent;

  ReviewFailed: {
    milestone: string;
    issues: number;
  } & BaseEvent;

  SecurityIssueDetected: {
    issue: string;
    severity: string;
  } & BaseEvent;

  PolicyViolationDetected: {
    agentId: string;
    operation: string;
    policy: string;
  } & BaseEvent;

  ContextCompressed: {
    tasksArchived: number;
    tokensSaved: number;
  } & BaseEvent;

  ManifestCreated: {
    manifestId: string;
    projectId: string;
    state: string;
    taskCount: number;
  } & BaseEvent;

  ManifestUpdated: {
    manifestId: string;
    projectId: string;
    state: string;
    changedFields: string[];
  } & BaseEvent;

  AgentRegistered: {
    agentId: string;
    role: string;
    capabilities: {
      planning: boolean;
      coding: boolean;
      testing: boolean;
      reviewing: boolean;
      security: boolean;
      orchestration: boolean;
    };
    status: string;
  } & BaseEvent;

  AgentStarted: {
    agentId: string;
    taskId: string;
    manifestId: string;
    role: string;
  } & BaseEvent;

  AgentStopped: {
    agentId: string;
    taskId: string;
    manifestId: string;
    role: string;
    duration: number;
    result: string;
  } & BaseEvent;

  AgentStatusChanged: {
    agentId: string;
    from: string;
    to: string;
  } & BaseEvent;

  ScheduleCreated: {
    manifestId: string;
    projectId: string;
    taskCount: number;
  } & BaseEvent;

  ScheduleCompleted: {
    manifestId: string;
    projectId: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    result: string;
  } & BaseEvent;

  TaskAssigned: {
    taskId: string;
    agentId: string;
    manifestId: string;
    assignmentId: string;
  } & BaseEvent;

  TaskUnassigned: {
    taskId: string;
    agentId: string;
    assignmentId: string;
  } & BaseEvent;

  ModelResolved: {
    taskId: string;
    agentId: string;
    modelId: string;
    resolutionSource: string;
    reason: string;
  } & BaseEvent;

  ModelConfigurationUpdated: {
    changedBy: string;
    changes: Array<{ field: string; oldValue: string; newValue: string }>;
  } & BaseEvent;

  EntityCreated: {
    entityId: string;
    kind: string;
    properties: Record<string, unknown>;
    source: string;
  } & BaseEvent;

  RelationshipCreated: {
    relationshipId: string;
    type: string;
    sourceId: string;
    targetId: string;
    properties?: Record<string, unknown>;
  } & BaseEvent;

  SubgraphMaterialized: {
    entityId: string;
    entityCount: number;
    relationshipCount: number;
    contextKey: string;
  } & BaseEvent;

  GraphQueryExecuted: {
    queryType: string;
    fromId?: string;
    toId?: string;
    resultCount: number;
  } & BaseEvent;
}

export type EventName = keyof EventMap & string;
export type EventPayload<E extends EventName> = EventMap[E];
