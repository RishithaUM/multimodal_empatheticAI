/**
 * Emotion WebSocket Service — v2
 * - Connects to a real WebSocket backend (configurable URL)
 * - Falls back to simulated stream when no server is available
 * - Persists emotion history to localStorage
 */

import type { FusedResult } from './emotionApi';

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'simulated';

export interface WSMessage {
  type: 'emotion_update' | 'session_start' | 'session_end' | 'ping' | 'pong' | 'error';
  payload?: FusedResult;
  sessionId?: string;
  error?: string;
  timestamp: number;
}

export interface PersistedEmotionEntry extends FusedResult {
  id: string;
  sessionId: string;
}

const STORAGE_KEY = 'empathai_emotion_history';
const MIGRATION_KEY = 'empathai_history_v2';
const MAX_PERSISTED = 200;

// One-time migration: clear old simulated history data
if (!localStorage.getItem(MIGRATION_KEY)) {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(MIGRATION_KEY, '1');
}

type EmotionListener = (result: FusedResult) => void;
type StatusListener = (status: WSStatus) => void;

class EmotionWebSocketService {
  private ws: WebSocket | null = null;
  private emotionListeners: Set<EmotionListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private status: WSStatus = 'disconnected';
  private sessionId = '';
  private serverUrl = '';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  // Realistic emotion simulation sequence
  private readonly emotionSequence = [
    { emotion: 'Happy', confidence: 88, intensity: 72 },
    { emotion: 'Happy', confidence: 91, intensity: 78 },
    { emotion: 'Excited', confidence: 76, intensity: 65 },
    { emotion: 'Neutral', confidence: 82, intensity: 40 },
    { emotion: 'Calm', confidence: 79, intensity: 35 },
    { emotion: 'Happy', confidence: 85, intensity: 68 },
    { emotion: 'Anxious', confidence: 71, intensity: 58 },
    { emotion: 'Neutral', confidence: 77, intensity: 42 },
    { emotion: 'Sad', confidence: 74, intensity: 55 },
    { emotion: 'Anxious', confidence: 80, intensity: 62 },
    { emotion: 'Happy', confidence: 93, intensity: 80 },
    { emotion: 'Excited', confidence: 84, intensity: 70 },
  ];
  private seqIndex = 0;

  // ─── Public API ────────────────────────────────────────────────────────────

  connect(serverUrl?: string): void {
    this.sessionId = `session_${Date.now()}`;
    this.serverUrl = serverUrl || '';

    if (serverUrl) {
      this.tryWebSocket(serverUrl);
    } else {
      this.setStatus('disconnected');
    }
  }

  disconnect(): void {
    this.stopSimulation();
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  onEmotion(listener: EmotionListener): () => void {
    this.emotionListeners.add(listener);
    return () => this.emotionListeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): WSStatus {
    return this.status;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // ─── Persistence ───────────────────────────────────────────────────────────

  loadPersistedHistory(): PersistedEmotionEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as PersistedEmotionEntry[];
    } catch {
      return [];
    }
  }

  persistEntry(result: FusedResult): PersistedEmotionEntry {
    const entry: PersistedEmotionEntry = {
      ...result,
      id: `${result.timestamp}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId: this.sessionId,
    };
    try {
      const existing = this.loadPersistedHistory();
      const updated = [entry, ...existing].slice(0, MAX_PERSISTED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage quota exceeded — ignore
    }
    return entry;
  }

  clearPersistedHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ─── WebSocket Connection ──────────────────────────────────────────────────

  private tryWebSocket(url: string): void {
    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.ws?.send(
          JSON.stringify({ type: 'session_start', sessionId: this.sessionId, timestamp: Date.now() })
        );
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data as string);
          if (msg.type === 'emotion_update' && msg.payload) {
            this.persistEntry(msg.payload);
            this.notifyEmotionListeners(msg.payload);
          }
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onerror = () => {
        this.handleConnectionFailure();
      };

      this.ws.onclose = (ev) => {
        this.stopPing();
        // Only reconnect if we were previously connected (not a deliberate close)
        if (this.status === 'connected' && ev.code !== 1000) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.handleConnectionFailure();
    }
  }

  private handleConnectionFailure(): void {
    console.info('[EmpathAI WS] Server unavailable — showing disconnected state');
    this.stopPing();
    this.setStatus('error');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.info('[EmpathAI WS] Max reconnect attempts reached');
      this.setStatus('error');
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    console.info(`[EmpathAI WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.setStatus('connecting');
    this.reconnectTimeout = setTimeout(() => this.tryWebSocket(this.serverUrl), delay);
  }

  // ─── Ping / Keepalive ──────────────────────────────────────────────────────

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ─── Simulation ────────────────────────────────────────────────────────────

  private startSimulation(): void {
    this.setStatus('simulated');
    if (this.simulationInterval) return;
    this.emitSimulatedEmotion();
    this.simulationInterval = setInterval(() => this.emitSimulatedEmotion(), 3500);
  }

  private stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private emitSimulatedEmotion(): void {
    const base = this.emotionSequence[this.seqIndex % this.emotionSequence.length];
    this.seqIndex++;

    const jitter = () => Math.round((Math.random() - 0.5) * 12);
    const clamp = (v: number) => Math.min(99, Math.max(40, v));

    const confidence = clamp(base.confidence + jitter());
    const intensity = clamp(base.intensity + jitter());
    const faceScore = clamp(confidence + jitter());
    const voiceScore = clamp(confidence + jitter());
    const textScore = clamp(confidence + jitter());

    const result: FusedResult = {
      emotion: base.emotion,
      confidence,
      intensity,
      intensityLabel: intensity > 66 ? 'High' : intensity > 33 ? 'Medium' : 'Low',
      modalities: [
        {
          modality: 'face',
          emotion: base.emotion,
          confidence: faceScore,
          scores: [
            { emotion: base.emotion, confidence: faceScore },
            { emotion: 'Neutral', confidence: 100 - faceScore },
          ],
        },
        {
          modality: 'voice',
          emotion: base.emotion,
          confidence: voiceScore,
          scores: [
            { emotion: base.emotion, confidence: voiceScore },
            { emotion: 'Neutral', confidence: 100 - voiceScore },
          ],
        },
        {
          modality: 'text',
          emotion: base.emotion,
          confidence: textScore,
          scores: [
            { emotion: base.emotion, confidence: textScore },
            { emotion: 'Neutral', confidence: 100 - textScore },
          ],
        },
      ],
      fusionWeights: { face: 45, voice: 35, text: 20 },
      timestamp: Date.now(),
    };

    this.persistEntry(result);
    this.notifyEmotionListeners(result);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private setStatus(status: WSStatus): void {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  private notifyEmotionListeners(result: FusedResult): void {
    this.emotionListeners.forEach((l) => l(result));
  }
}

// Singleton
export const emotionWS = new EmotionWebSocketService();
