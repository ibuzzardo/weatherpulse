// Sprint 5 - Realtime WebSocket connection manager
// Drop-in path suggestion: src/realtime/ws/client.ts

import { RealtimeEnvelope, isRealtimeEnvelope } from './types';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'out_of_sync' | 'closed';

export interface RealtimeClientOptions {
  projectId: string;
  // Base should be HTTP origin (e.g. http://mission-control:3000)
  baseHttpUrl?: string;
  // If provided, overrides computed ws URL
  wsUrl?: string;
  token?: string;
  getLastSequence?: () => number;
  onEvent: (event: RealtimeEnvelope) => void;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
  maxBackoffMs?: number;
}

interface ResumeMessage {
  type: 'resume';
  projectId: string;
  fromSequence: number;
}

function toWsUrl(baseHttpUrl: string, projectId: string): string {
  // Supports http://mission-control:3000 -> ws://mission-control:3000/ws/projects/:id/stream
  const u = new URL(baseHttpUrl);
  const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${u.host}/ws/projects/${encodeURIComponent(projectId)}/stream`;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private options: Required<Pick<RealtimeClientOptions, 'onEvent'>> & RealtimeClientOptions;
  private state: ConnectionState = 'idle';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private explicitlyClosed = false;
  private seenEventIds = new Set<string>();

  constructor(options: RealtimeClientOptions) {
    this.options = {
      maxBackoffMs: 30_000,
      ...options,
      onEvent: options.onEvent,
    };
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.explicitlyClosed = false;
    this.setState(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const baseHttpUrl = this.options.baseHttpUrl ?? (typeof window !== 'undefined' ? window.location.origin : 'http://mission-control:3000');
    const url = this.options.wsUrl ?? toWsUrl(baseHttpUrl, this.options.projectId);
    const wsUrl = this.options.token ? `${url}?token=${encodeURIComponent(this.options.token)}` : url;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState('connected');
      const fromSequence = this.options.getLastSequence?.() ?? 0;
      const resume: ResumeMessage = {
        type: 'resume',
        projectId: this.options.projectId,
        fromSequence,
      };
      this.sendJson(resume);
    };

    this.ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data));

        if (data?.type === 'resync_required') {
          this.setState('out_of_sync');
          return;
        }

        if (!isRealtimeEnvelope(data)) return;
        if (this.seenEventIds.has(data.eventId)) return;

        this.seenEventIds.add(data.eventId);
        if (this.seenEventIds.size > 5000) {
          // simple bounded memory window
          const arr = Array.from(this.seenEventIds).slice(-1000);
          this.seenEventIds = new Set(arr);
        }

        this.options.onEvent(data);
      } catch (err) {
        this.options.onError?.(err instanceof Error ? err : new Error('Unknown websocket parse error'));
      }
    };

    this.ws.onerror = () => {
      this.options.onError?.(new Error('Realtime websocket connection error'));
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.explicitlyClosed) {
        this.setState('closed');
        return;
      }
      this.scheduleReconnect();
    };
  }

  close() {
    this.explicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setState('closed');
  }

  sendJson(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1;
    this.setState('reconnecting');

    const cappedMax = this.options.maxBackoffMs ?? 30_000;
    const expo = Math.min(cappedMax, 1000 * Math.pow(2, this.reconnectAttempts - 1));
    const jitter = Math.floor(Math.random() * 350);
    const delay = expo + jitter;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setState(next: ConnectionState) {
    if (this.state === next) return;
    this.state = next;
    this.options.onStateChange?.(next);
  }
}
