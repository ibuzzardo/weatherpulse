# Sprint 5 Integration Notes — Mission Control Frontend

This handoff package provides a realtime layer on top of the existing REST dashboard/tasks pages.

Target base API host assumption: `http://mission-control:3000`

## Files delivered

- `ws/types.ts`
- `ws/client.ts`
- `store/realtimeTasksReducer.ts`
- `store/realtimeTasksStore.tsx`
- `hooks/useRealtimeTasks.ts`
- `components/RealtimeTaskList.tsx`

---

## 1) Recommended destination paths in MC frontend

```text
src/realtime/ws/types.ts
src/realtime/ws/client.ts
src/realtime/store/realtimeTasksReducer.ts
src/realtime/store/realtimeTasksStore.tsx
src/realtime/hooks/useRealtimeTasks.ts
src/realtime/components/RealtimeTaskList.tsx
```

---

## 2) Expected WebSocket endpoint contract

Client will connect to:

```text
ws://mission-control:3000/ws/projects/:projectId/stream
```

- Supports incoming event envelope:
  - `v`, `eventId`, `sequence`, `ts`, `type`, `taskId`, `payload`
- Supports optional control message:
  - `{ type: "resync_required" }`
- On open, client sends:
  - `{ type: "resume", projectId, fromSequence }`

---

## 3) Initial wiring in tasks page (example)

Create/update your tasks page to bootstrap from REST, then wrap realtime provider.

```tsx
// app/tasks/page.tsx (server component)
import { RealtimeTasksProvider } from '@/realtime/store/realtimeTasksStore';
import { RealtimeTaskList } from '@/realtime/components/RealtimeTaskList';

async function getTasks() {
  const res = await fetch('http://mission-control:3000/api/tasks', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load tasks');
  return res.json();
}

async function getProjects() {
  const res = await fetch('http://mission-control:3000/api/projects', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function TasksPage() {
  const [tasks, projects] = await Promise.all([getTasks(), getProjects()]);
  const activeProject = projects.find((p: any) => p.status === 'ACTIVE') ?? projects[0];
  const projectId = activeProject?.id;

  if (!projectId) {
    return <div className="p-6 text-slate-300">No active project found</div>;
  }

  return (
    <RealtimeTasksProvider
      projectId={projectId}
      initialTasks={tasks}
      baseHttpUrl="http://mission-control:3000"
    >
      <RealtimeTaskList />
    </RealtimeTasksProvider>
  );
}
```

> If your app already has a task list component, keep it and only add provider + hook usage.

---

## 4) Reducer behavior included

Handled events and status mapping:

- `task.assigned` -> assignee update + auto `ASSIGNED` from `TO_DO`
- `task.status.changed` -> direct status update
- `task.execution.started` -> `IN_PROGRESS`
- `task.blocked` / `task.unblocked` -> `BLOCKED` / `IN_PROGRESS`
- `task.handoff.requested` -> `HANDOFF_PENDING`
- `task.handoff.accepted` -> `HANDOFF_IN_PROGRESS`
- `task.review.passed` -> `IN_REVIEW`
- `task.review.failed` / `task.execution.failed` -> `FAILED`
- `task.completed` -> `DONE`

Plus:
- sequence ordering guard
- eventId dedupe in WS client
- timeline (last 200 events)

---

## 5) Optional enhancements after merge

1. Add replay fallback when state=`out_of_sync`:
   - `GET /api/events?projectId=...&sinceSequence=...`
2. Add toasts for blocker/escalation events (`system.notification`)
3. Wire dashboards counters from reducer for near-instant KPI updates
4. Add handoff chain UI per task card

---

## 6) Safety/compat notes

- All modules are client-safe TS/TSX and avoid external libs
- If lint enforces strict exhaustive deps, keep existing comment in provider effect
- If your app requires relative URLs in browser, replace `baseHttpUrl` with `window.location.origin`

---

## 7) Quick verification steps

1. Open tasks page
2. Confirm connection state transitions to `connected`
3. Emit a test event from backend WS (e.g. `task.execution.started` for a known task)
4. Confirm task status updates live without refresh
5. Toggle backend WS off/on; confirm reconnect transitions
