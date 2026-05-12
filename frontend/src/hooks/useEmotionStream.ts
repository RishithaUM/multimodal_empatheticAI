import { useState, useRef, useCallback, useEffect } from 'react';
import type { ModalityResult } from '@/services/emotionApi';

export interface EmotionStreamResult {
  frameEmotion: string;
  frameConfidence: number;
  frameScores: Array<{ emotion: string; confidence: number }>;
  frameNumber: number;
  stable: boolean;
  stableEmotion: {
    emotion: string;
    confidence: number;
    scores: Array<{ emotion: string; confidence: number }>;
  } | null;
}

export interface UseEmotionStreamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: 'idle' | 'streaming' | 'stable' | 'error';
  currentEmotion: EmotionStreamResult | null;
  frameCount: number;
  error: string | null;
  startStream: () => Promise<void>;
  stopStream: () => void;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useEmotionStream(): UseEmotionStreamReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestInFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const isStreamingRef = useRef(false);
  const statusRef = useRef<'idle' | 'streaming' | 'stable' | 'error'>('idle');

  const [status, setStatus] = useState<'idle' | 'streaming' | 'stable' | 'error'>('idle');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionStreamResult | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const useTestEndpoint = import.meta.env.DEV;
  const backendBaseUrl = import.meta.env.DEV
    ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000')
    : '';

  const captureAndAnalyze = useCallback(async () => {
    // Don't capture if not streaming or if already stable
    if (!isStreamingRef.current) return;
    // Avoid flooding backend with overlapping requests
    if (requestInFlightRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState !== 4) return;

    requestInFlightRef.current = true;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      // Keep frames smaller to reduce request size and backend pressure
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.65);

      // Send to backend
      const token = localStorage.getItem('token');
      const endpointPath = useTestEndpoint
        ? '/api/emotion/detect/face/stream/test'
        : (token ? '/api/emotion/detect/face/stream' : '/api/emotion/detect/face/stream/test');
      const endpoint = `${backendBaseUrl}${endpointPath}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        signal: controller.signal,
        body: JSON.stringify({
          frame: frameBase64,
          session_id: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.warn('Frame analysis failed:', result.error);
        return;
      }

      // Update frame count
      setFrameCount(result.frame_number);

      // Update current emotion
      const emotionData: EmotionStreamResult = {
        frameEmotion: result.frame_emotion,
        frameConfidence: Math.round(result.frame_confidence * 100),
        frameScores: result.frame_scores.map((s: any) => ({
          emotion: s.emotion,
          confidence: Math.round(s.confidence * 100),
        })),
        frameNumber: result.frame_number,
        stable: result.stable,
        stableEmotion: result.stable_emotion
          ? {
              emotion: result.stable_emotion.emotion,
              confidence: Math.round(result.stable_emotion.confidence * 100),
              scores: result.stable_emotion.scores.map((s: any) => ({
                emotion: s.emotion,
                confidence: Math.round(s.confidence * 100),
              })),
            }
          : null,
      };

      setCurrentEmotion(emotionData);
      consecutiveErrorsRef.current = 0;

      // Log frame
      if (result.success) {
        console.log(
          `Frame ${result.frame_number}: ${result.frame_emotion} (${Math.round(result.frame_confidence * 100)}%)`
        );
      } else {
        console.log(`Frame ${result.frame_number}: ⚠️ ${result.error || 'No face detected'}`);
      }

      // Check if stable
      if (result.stable) {
        console.log(`✅ STABLE EMOTION DETECTED: ${result.stable_emotion.emotion}`);
        isStreamingRef.current = false;
        
        // Immediately clear interval to stop sending more frames
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        
        statusRef.current = 'stable';
        setStatus('stable');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      console.error('Capture error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);

      consecutiveErrorsRef.current += 1;
      if (consecutiveErrorsRef.current >= 3) {
        isStreamingRef.current = false;
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        statusRef.current = 'error';
        setStatus('error');
      }
    } finally {
      requestInFlightRef.current = false;
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [backendBaseUrl, useTestEndpoint]);

  const startStream = useCallback(async () => {
    try {
      statusRef.current = 'streaming';
      setStatus('streaming');
      setFrameCount(0);
      setCurrentEmotion(null);
      setError(null);
      consecutiveErrorsRef.current = 0;
      isStreamingRef.current = true;

      // Reset session ID for new stream
      sessionIdRef.current = generateSessionId();

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start capturing frames every 900ms to keep CPU/network stable on low-memory devices
      captureIntervalRef.current = setInterval(captureAndAnalyze, 900);

      console.log('✅ Emotion stream started');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to access camera';
      console.error('Start stream error:', msg);
      setError(msg);
      statusRef.current = 'error';
      setStatus('error');
      isStreamingRef.current = false;
    }
  }, [captureAndAnalyze]);

  const stopStream = useCallback(() => {
    isStreamingRef.current = false;

    // Stop capture interval
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Cancel in-flight request to avoid late errors after stopping
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    requestInFlightRef.current = false;

    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (statusRef.current !== 'stable') {
      statusRef.current = 'idle';
      setStatus('idle');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    status,
    currentEmotion,
    frameCount,
    error,
    startStream,
    stopStream,
  };
}
