import { useState, useEffect, useRef, useCallback } from 'react';
import { detectFaceEmotion, detectFaceEmotionMultiFrame } from '@/services/emotionApi';
import type { ModalityResult } from '@/services/emotionApi';

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'error' | 'unsupported';

export interface UseFaceDetectionReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  lastResult: ModalityResult | null;
  isDetecting: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => Promise<ModalityResult | null>;
  captureMultiFrame: (options?: { samplingInterval?: number; maxFrames?: number }) => Promise<ModalityResult | null>;
}

export function useFaceDetection(autoDetect = false, intervalMs = 2000): UseFaceDetectionReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ModalityResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setCameraError('Camera not supported in this browser.');
      return;
    }

    setCameraStatus('requesting');
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStatus('active');

      if (autoDetect) {
        intervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            setIsDetecting(true);
            const result = await detectFaceEmotion(videoRef.current);
            if (result) setLastResult(result);
            setIsDetecting(false);
          }
        }, intervalMs);
      }
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : err?.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : 'Failed to access camera.';
      setCameraStatus('error');
      setCameraError(msg);
    }
  }, [autoDetect, intervalMs]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
    setLastResult(null);
  }, []);

  const captureFrame = useCallback(async (): Promise<ModalityResult | null> => {
    if (!videoRef.current || cameraStatus !== 'active') return null;
    setIsDetecting(true);
    const result = await detectFaceEmotion(videoRef.current);
    if (result) setLastResult(result);
    setIsDetecting(false);
    return result;
  }, [cameraStatus]);

  const captureMultiFrame = useCallback(async (options?: { samplingInterval?: number; maxFrames?: number }): Promise<ModalityResult | null> => {
    if (!videoRef.current || cameraStatus !== 'active') return null;
    setIsDetecting(true);
    const result = await detectFaceEmotionMultiFrame(videoRef.current, options);
    if (result) setLastResult(result);
    setIsDetecting(false);
    return result;
  }, [cameraStatus]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    cameraStatus,
    cameraError,
    lastResult,
    isDetecting,
    startCamera,
    stopCamera,
    captureFrame,
    captureMultiFrame,
  };
}
