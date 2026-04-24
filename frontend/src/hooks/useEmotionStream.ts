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
  const isStreamingRef = useRef(false);
  const statusRef = useRef<'idle' | 'streaming' | 'stable' | 'error'>('idle');

  const [status, setStatus] = useState<'idle' | 'streaming' | 'stable' | 'error'>('idle');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionStreamResult | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const captureAndAnalyze = useCallback(async () => {
    // Don't capture if not streaming or if already stable
    if (!isStreamingRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState !== 4) return;

    try {
      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);

      // Send to backend
      const token = localStorage.getItem('token');
      const endpoint = token ? '/api/emotion/detect/face/stream' : '/api/emotion/detect/face/stream/test';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
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
      console.error('Capture error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const startStream = useCallback(async () => {
    try {
      statusRef.current = 'streaming';
      setStatus('streaming');
      setFrameCount(0);
      setCurrentEmotion(null);
      setError(null);
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

      // Start capturing frames every 500ms (2 times per second)
      captureIntervalRef.current = setInterval(captureAndAnalyze, 500);

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

    console.log('⛔ Emotion stream stopped');
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
