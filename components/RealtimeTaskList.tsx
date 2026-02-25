// Sprint 5 - Initial UI wiring for live task updates
// Drop-in path suggestion: src/realtime/components/RealtimeTaskList.tsx
'use client';

import React from 'react';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';

function statusDot(connectionState: string) {
  switch (connectionState) {
    case 'connected':
      return '🟢';
    case 'reconnecting':
      return '🟡';
    case 'out_of_sync':
      return '🔴';
    default:
      return '⚪';
  }
}

export function RealtimeTaskList() {
  const { tasks, connectionState, timeline, lastSequence } = useRealtimeTasks();

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-slate-900/60 p-3">
        <div className="text-sm text-slate-200">
          {statusDot(connectionState)} Realtime: <span className="font-semibold">{connectionState}</span>
        </div>
        <div className="text-xs text-slate-400">seq #{lastSequence}</div>
      </header>

      <div className="grid gap-2">
        {tasks.map((task) => (
          <article
            key={task.id}
            className="rounded-lg border border-white/10 bg-[#1a1a2e] p-3 transition hover:border-cyan-400/40"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{task.title}</h3>
              <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">
                {task.status}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              assignee: {task.assigneeId ?? 'unassigned'} · updated: {new Date(task.updatedAt).toLocaleTimeString()}
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Live Timeline</h4>
        <ul className="space-y-1 text-xs text-slate-400">
          {timeline.slice(0, 8).map((item) => (
            <li key={item.eventId} className="flex items-center justify-between gap-3">
              <span>
                {item.type}
                {item.taskId ? ` · ${item.taskId.slice(0, 8)}` : ''}
              </span>
              <span>{new Date(item.ts).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
