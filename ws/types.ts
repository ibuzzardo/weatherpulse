// Sprint 5 - Realtime types/interfaces for Mission Control
// Drop-in path suggestion: src/realtime/ws/types.ts

export type UUID = string;
export type ISODateString = string;

export type TaskStatus =
  | 'TO_DO'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'IN_REVIEW'
  | 'HANDOFF_PENDING'
  | 'HANDOFF_IN_PROGRESS'
  | 'DONE'
  | 'FAILED';

export interface Task {
  id: UUID;
  title: string;
  description: string | null;
  assigneeId: UUID | null;
  projectId: UUID | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  dueDate: ISODateString | null;
  status: TaskStatus | string;
  tags: string[] | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type MCRealtimeEventType =
  | 'task.created'
  | 'task.updated'
  | 'task.status.changed'
  | 'task.assigned'
  | 'task.execution.started'
  | 'task.execution.progress'
  | 'task.blocked'
  | 'task.unblocked'
  | 'task.handoff.requested'
  | 'task.handoff.accepted'
  | 'task.handoff.rejected'
  | 'task.review.passed'
  | 'task.review.failed'
  | 'task.completed'
  | 'agent.status.changed'
  | 'agent.workload.updated'
  | 'system.notification'
  | 'sprint.metrics.updated';

export interface RealtimeEnvelope<TPayload = unknown> {
  v: 1;
  eventId: string;
  sequence: number;
  ts: ISODateString;
  type: MCRealtimeEventType;
  projectId?: string;
  taskId?: string;
  payload: TPayload;
}

export interface TaskAssignedPayload {
  assigneeId: string;
  assignedBy?: string;
  reason?: string;
  previousAssigneeId?: string | null;
}

export interface TaskStatusChangedPayload {
  from: TaskStatus | string;
  to: TaskStatus | string;
  actorId?: string;
  reason?: string;
}

export interface TaskExecutionStartedPayload {
  agentId: string;
  startedAt?: ISODateString;
  runId?: string;
}

export interface TaskExecutionProgressPayload {
  agentId: string;
  percent?: number;
  message?: string;
  artifactUrls?: string[];
}

export interface TaskBlockedPayload {
  reason?: string;
  blockerCode?: string;
  escalated?: boolean;
}

export interface TaskHandoffRequestedPayload {
  fromAgentId: string;
  toAgentId: string;
  handoffType: 'review' | 'deploy' | 'followup' | string;
  notes?: string;
}

export interface TaskHandoffAcceptedPayload {
  fromAgentId: string;
  toAgentId: string;
}

export interface TaskHandoffRejectedPayload {
  fromAgentId: string;
  toAgentId: string;
  reason?: string;
}

export type TaskRealtimeEvent =
  | RealtimeEnvelope<{ task: Task }>
  | RealtimeEnvelope<TaskAssignedPayload>
  | RealtimeEnvelope<TaskStatusChangedPayload>
  | RealtimeEnvelope<TaskExecutionStartedPayload>
  | RealtimeEnvelope<TaskExecutionProgressPayload>
  | RealtimeEnvelope<TaskBlockedPayload>
  | RealtimeEnvelope<TaskHandoffRequestedPayload>
  | RealtimeEnvelope<TaskHandoffAcceptedPayload>
  | RealtimeEnvelope<TaskHandoffRejectedPayload>
  | RealtimeEnvelope<Record<string, unknown>>;

export interface ReplayResponse {
  events: RealtimeEnvelope[];
  lastSequence: number;
}

export function isRealtimeEnvelope(input: unknown): input is RealtimeEnvelope {
  if (!input || typeof input !== 'object') return false;
  const e = input as Record<string, unknown>;
  return (
    e.v === 1 &&
    typeof e.eventId === 'string' &&
    typeof e.sequence === 'number' &&
    typeof e.ts === 'string' &&
    typeof e.type === 'string' &&
    'payload' in e
  );
}
