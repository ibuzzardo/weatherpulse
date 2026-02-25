// Sprint 5 - Realtime task store provider
// Drop-in path suggestion: src/realtime/store/realtimeTasksStore.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { RealtimeClient, ConnectionState } from '../ws/client';
import { RealtimeEnvelope, Task } from '../ws/types';
import {
  initialRealtimeTasksState,
  realtimeTasksReducer,
  RealtimeTasksState,
  selectTasks,
} from './realtimeTasksReducer';

interface RealtimeTasksContextValue {
  state: RealtimeTasksState;
  tasks: Task[];
}

const RealtimeTasksContext = createContext<RealtimeTasksContextValue | null>(null);

export interface RealtimeTasksProviderProps {
  children: React.ReactNode;
  projectId: string;
  initialTasks: Task[];
  baseHttpUrl?: string;
  wsUrl?: string;
  token?: string;
}

export function RealtimeTasksProvider({
  children,
  projectId,
  initialTasks,
  baseHttpUrl = 'http://mission-control:3000',
  wsUrl,
  token,
}: RealtimeTasksProviderProps) {
  const [state, dispatch] = useReducer(realtimeTasksReducer, initialRealtimeTasksState);
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    dispatch({ type: 'BOOTSTRAP_TASKS', payload: initialTasks });
  }, [initialTasks]);

  useEffect(() => {
    const onEvent = (event: RealtimeEnvelope) => dispatch({ type: 'APPLY_EVENT', payload: event });
    const onStateChange = (status: ConnectionState) => dispatch({ type: 'SET_CONNECTION_STATE', payload: status });

    const client = new RealtimeClient({
      projectId,
      baseHttpUrl,
      wsUrl,
      token,
      getLastSequence: () => state.lastSequence,
      onEvent,
      onStateChange,
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.close();
      clientRef.current = null;
    };
    // intentionally not depending on state.lastSequence to avoid reconnect loops
    // last sequence is read on reconnect via getter closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, baseHttpUrl, wsUrl, token]);

  const value = useMemo(
    () => ({
      state,
      tasks: selectTasks(state),
    }),
    [state]
  );

  return <RealtimeTasksContext.Provider value={value}>{children}</RealtimeTasksContext.Provider>;
}

export function useRealtimeTasksStore(): RealtimeTasksContextValue {
  const ctx = useContext(RealtimeTasksContext);
  if (!ctx) throw new Error('useRealtimeTasksStore must be used inside RealtimeTasksProvider');
  return ctx;
}
