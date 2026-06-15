export interface ScheduleResult {
  manifestId: string;
  totalTasks: number;
  assignedTasks: number;
  skippedTasks: number;
  assignments: Array<{
    taskId: string;
    assignmentId: string;
    agentId: string;
    status: string;
  }>;
}

export interface SchedulerStatus {
  queuedTasks: number;
  activeAssignments: number;
  completedAssignments: number;
  failedAssignments: number;
  idleAgents: number;
  busyAgents: number;
}
