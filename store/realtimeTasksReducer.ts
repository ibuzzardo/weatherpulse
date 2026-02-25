// Sprint 5 - Reducer/store integration for realtime tasks
// Drop-in path suggestion: src/realtime/store/realtimeTasksReducer.ts

import { RealtimeEnvelope, Task } from '../ws/types';
import { ConnectionState } from '../ws/client';

export interface TaskTimelineEntry {
  eventId: string;
  sequence: number;
  ts: string;
  type: string;
  taskId?: string;
  message?: string;
}

export interface RealtimeTasksState {
  byId: Record<string, Task>;
  order: string[];
  lastSequence: number;
  timeline: TaskTimelineEntry[];
  connectionState: ConnectionState;
  initialized: boolean;
}

export type RealtimeTasksAction =
  | { type: 'BOOTSTRAP_TASKS'; payload: Task[] }
  | { type: 'APPLY_EVENT'; payload: RealtimeEnvelope }
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'RESET' };

export const initialRealtimeTasksState: RealtimeTasksState = {
  byId: {},
  order: [],
  lastSequence: 0,
  timeline: [],
  connectionState: 'idle',
  initialized: false,
};

function upsertTask(state: RealtimeTasksState, task: Task): RealtimeTasksState {
  const exists = Boolean(state.byId[task.id]);
  return {
    ...state,
    byId: { ...state.byId, [task.id]: task },
    order: exists ? state.order : [task.id, ...state.order],
  };
}

function appendTimeline(state: RealtimeTasksState, e: RealtimeEnvelope, message?: string): RealtimeTasksState {
  const next: TaskTimelineEntry = {
    eventId: e.eventId,
    sequence: e.sequence,
    ts: e.ts,
    type: e.type,
    taskId: e.taskId,
    message,
  };

  const timeline = [next, ...state.timeline].slice(0, 200);
  return { ...state, timeline };
}

export function realtimeTasksReducer(
  state: RealtimeTasksState,
  action: RealtimeTasksAction
): RealtimeTasksState {
  switch (action.type) {
    case 'BOOTSTRAP_TASKS': {
      const byId: Record<string, Task> = {};
      const order: string[] = [];
      for (const t of action.payload) {
        byId[t.id] = t;
        order.push(t.id);
      }
      return { ...state, byId, order, initialized: true };
    }

    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.payload };

    case 'APPLY_EVENT': {
      const e = action.payload;
      if (e.sequence <= state.lastSequence) return state;

      let next = { ...state, lastSequence: e.sequence };

      // Generic task payload support: { task: Task }
      const payloadTask = (e.payload as { task?: Task })?.task;
      if (payloadTask && payloadTask.id) {
        next = upsertTask(next, payloadTask);
      }

      if (e.taskId) {
        const existing = next.byId[e.taskId];
        if (existing) {
          switch (e.type) {
            case 'task.assigned': {
              const assigneeId = (e.payload as { assigneeId?: string }).assigneeId ?? existing.assigneeId;
              next = upsertTask(next, {
                ...existing,
                assigneeId,
                status: existing.status === 'TO_DO' ? 'ASSIGNED' : existing.status,
                updatedAt: e.ts,
              });
              break;
            }
            case 'task.status.changed': {
              const to = (e.payload as { to?: string }).to ?? existing.status;
              next = upsertTask(next, { ...existing, status: to, updatedAt: e.ts });
              break;
            }
            case 'task.execution.started':
              next = upsertTask(next, { ...existing, status: 'IN_PROGRESS', updatedAt: e.ts });
              break;
            case 'task.blocked':
              next = upsertTask(next, { ...existing, status: 'BLOCKED', updatedAt: e.ts });
              break;
            case 'task.unblocked':
              next = upsertTask(next, {
                ...existing,
                status: existing.status === 'BLOCKED' ? 'IN_PROGRESS' : existing.status,
                updatedAt: e.ts,
              });
              break;
            case 'task.handoff.requested':
              next = upsertTask(next, { ...existing, status: 'HANDOFF_PENDING', updatedAt: e.ts });
              break;
            case 'task.handoff.accepted':
              next = upsertTask(next, { ...existing, status: 'HANDOFF_IN_PROGRESS', updatedAt: e.ts });
              break;
            case 'task.review.passed':
              next = upsertTask(next, { ...existing, status: 'IN_REVIEW', updatedAt: e.ts });
              break;
            case 'task.review.failed':
            case 'task.execution.failed':
              next = upsertTask(next, { ...existing, status: 'FAILED', updatedAt: e.ts });
              break;
            case 'task.completed':
              next = upsertTask(next, { ...existing, status: 'DONE', updatedAt: e.ts });
              break;
            default:
              break;
          }
        }
      }

      next = appendTimeline(next, e);
      return next;
    }

    case 'RESET':
      return initialRealtimeTasksState;

    default:
      return state;
  }
}

export const selectTasks = (state: RealtimeTasksState): Task[] =>
  state.order.map((id) => state.byId[id]).filter(Boolean);

export const selectTaskById = (state: RealtimeTasksState, id: string): Task | undefined => state.byId[id];
