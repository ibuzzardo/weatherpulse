// Sprint 5 - Convenience hook
// Drop-in path suggestion: src/realtime/hooks/useRealtimeTasks.ts
'use client';

import { useMemo } from 'react';
import { useRealtimeTasksStore } from '../store/realtimeTasksStore';

export function useRealtimeTasks() {
  const { state, tasks } = useRealtimeTasksStore();

  const grouped = useMemo(() => {
    return tasks.reduce<Record<string, typeof tasks>>((acc, task) => {
      const key = task.status ?? 'UNKNOWN';
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  return {
    tasks,
    grouped,
    timeline: state.timeline,
    connectionState: state.connectionState,
    lastSequence: state.lastSequence,
    initialized: state.initialized,
  };
}
