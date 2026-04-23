import { useState, useEffect, useCallback, useRef } from 'react';
import { emotionWS, WSStatus } from '@/services/emotionWebSocket';
import type { FusedResult } from '@/services/emotionApi';
import type { PersistedEmotionEntry } from '@/services/emotionWebSocket';

export interface EmotionHistoryEntry extends FusedResult {
  id: string;
  sessionId?: string;
}

export interface UseEmotionWebSocketReturn {
  currentEmotion: FusedResult | null;
  history: EmotionHistoryEntry[];
  persistedHistory: PersistedEmotionEntry[];
  wsStatus: WSStatus;
  isConnected: boolean;
  connect: (serverUrl?: string) => void;
  disconnect: () => void;
  clearHistory: () => void;
  clearPersistedHistory: () => void;
}

const MAX_SESSION_HISTORY = 50;

export function useEmotionWebSocket(
  autoConnect = false,
  serverUrl?: string
): UseEmotionWebSocketReturn {
  const [currentEmotion, setCurrentEmotion] = useState<FusedResult | null>(null);
  const [history, setHistory] = useState<EmotionHistoryEntry[]>([]);
  const [persistedHistory, setPersistedHistory] = useState<PersistedEmotionEntry[]>(() =>
    emotionWS.loadPersistedHistory()
  );
  const [wsStatus, setWsStatus] = useState<WSStatus>(emotionWS.getStatus());
  const connectedRef = useRef(false);

  const connect = useCallback(
    (url?: string) => {
      if (connectedRef.current) return;
      connectedRef.current = true;
      emotionWS.connect(url ?? serverUrl);
    },
    [serverUrl]
  );

  const disconnect = useCallback(() => {
    connectedRef.current = false;
    emotionWS.disconnect();
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const clearPersistedHistory = useCallback(() => {
    emotionWS.clearPersistedHistory();
    setPersistedHistory([]);
  }, []);

  useEffect(() => {
    const unsubEmotion = emotionWS.onEmotion((result) => {
      setCurrentEmotion(result);
      setHistory((prev) => {
        const entry: EmotionHistoryEntry = {
          ...result,
          id: `${result.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
          sessionId: emotionWS.getSessionId(),
        };
        return [entry, ...prev].slice(0, MAX_SESSION_HISTORY);
      });
      // Refresh persisted history from storage
      setPersistedHistory(emotionWS.loadPersistedHistory());
    });

    const unsubStatus = emotionWS.onStatus((status) => {
      setWsStatus(status);
    });

    if (autoConnect) {
      connect(serverUrl);
    }

    return () => {
      unsubEmotion();
      unsubStatus();
    };
  }, [autoConnect, serverUrl, connect]);

  return {
    currentEmotion,
    history,
    persistedHistory,
    wsStatus,
    isConnected: wsStatus === 'connected' || wsStatus === 'simulated',
    connect,
    disconnect,
    clearHistory,
    clearPersistedHistory,
  };
}
