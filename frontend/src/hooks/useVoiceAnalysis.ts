import { useState, useRef, useCallback, useEffect } from 'react';
import type { ModalityResult, VoiceAnalysisResult } from '@/services/emotionApi';

export type VoiceStatus = 'idle' | 'requesting' | 'recording' | 'processing' | 'done' | 'error' | 'unsupported';

export interface UseVoiceAnalysisReturn {
  voiceStatus: VoiceStatus;
  voiceError: string | null;
  waveformData: number[];
  audioAnalysis: VoiceAnalysisResult | null;
  lastResult: ModalityResult | null;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<ModalityResult | null>;
  resetVoice: () => void;
}

const WAVEFORM_BARS = 20;

/**
 * Convert Float32 PCM audio to WAV format
 */
async function encodeWAV(pcmData: Float32Array, sampleRate: number): Promise<ArrayBuffer> {
  const numChannels = 1;
  const length = pcmData.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = length * bytesPerSample;
  const fileLength = 36 + dataLength;

  // Create WAV header and data
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, fileLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return arrayBuffer;
}

/**
 * Convert an ArrayBuffer to base64 safely without large spread operations.
 */
async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to convert audio buffer to base64'));
        return;
      }
      const base64 = reader.result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(new Blob([buffer], { type: 'audio/wav' }));
  });
}

function getUsableAuthToken(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) {
      localStorage.removeItem('token');
      return null;
    }

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = Number(decoded?.exp);

    if (!Number.isFinite(exp)) return token;

    const isExpired = Date.now() >= exp * 1000;
    if (isExpired) {
      localStorage.removeItem('token');
      return null;
    }

    return token;
  } catch {
    localStorage.removeItem('token');
    return null;
  }
}

export function useVoiceAnalysis(): UseVoiceAnalysisReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(Array(WAVEFORM_BARS).fill(4));
  const [audioAnalysis, setAudioAnalysis] = useState<VoiceAnalysisResult | null>(null);
  const [lastResult, setLastResult] = useState<ModalityResult | null>(null);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    // Use frequency data - much more responsive for speech visualization
    analyserRef.current.getByteFrequencyData(dataArray);

    const step = Math.floor(bufferLength / WAVEFORM_BARS);
    const bars = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
      const slice = dataArray.slice(i * step, (i + 1) * step);
      // Average the frequency values in this slice
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      // Aggressive scaling: map 0-255 to 0-100 with boost
      // Speech typically has values 0-100, so we amplify
      const scaled = Math.min(100, (avg / 255) * 150 + (avg > 10 ? 20 : 0));
      return Math.max(4, Math.round(scaled));
    });

    setWaveformData(bars);
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceStatus('unsupported');
      setVoiceError('Microphone not supported in this browser.');
      return;
    }

    setVoiceStatus('requesting');
    setVoiceError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API analyser for waveform
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; // Lower = more responsive for speech
      analyser.smoothingTimeConstant = 0.4; // Some smoothing for fluid motion
      analyser.minDecibels = -70;
      analyser.maxDecibels = -20;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      setVoiceStatus('recording');
      animateWaveform();
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone permission denied.'
        : 'Failed to access microphone.';
      setVoiceStatus('error');
      setVoiceError(msg);
    }
  }, [animateWaveform]);

  const stopRecording = useCallback(async (): Promise<ModalityResult | null> => {
    if (!mediaRecorderRef.current || voiceStatus !== 'recording') return null;

    setVoiceStatus('processing');

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current!;

      recorder.onstop = async () => {
        // Stop stream tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());

        // Send audio to backend for real wav2vec2 + SUPERB ER analysis
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

          // Convert WebM to WAV using Web Audio API
          const webmArrayBuffer = await blob.arrayBuffer();
          const audioCtx = audioContextRef.current || new AudioContext();

          // Some browsers detach the passed buffer during decode, so decode a cloned copy.
          const decodeBuffer = webmArrayBuffer.slice(0);
          const decoded = await audioCtx.decodeAudioData(decodeBuffer);
          const channelData = decoded.getChannelData(0);

          // Convert Float32Array PCM to WAV bytes, then base64 safely.
          const wavBuffer = await encodeWAV(channelData, decoded.sampleRate);
          const base64Audio = await arrayBufferToBase64(wavBuffer);

          console.log('[Voice] Sending audio to backend for voice emotion analysis...');

          // Send to backend API
          const token = getUsableAuthToken();
          const endpoint = token ? '/api/emotion/detect/voice' : '/api/emotion/detect/voice/test';
          let response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({
              audio_data: base64Audio,
            }),
          });

          // If token expired/invalid, clear it and retry once on test endpoint.
          if (response.status === 401 && token) {
            localStorage.removeItem('token');
            response = await fetch('/api/emotion/detect/voice/test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                audio_data: base64Audio,
              }),
            });
          }

          if (!response.ok) {
            const error = await response.json();
            if (response.status === 401) {
              throw new Error('Session expired. Please log in again.');
            }
            throw new Error(error.error || 'Backend voice analysis failed');
          }

          const backendResult = await response.json();

          console.log('[Voice] Backend analysis complete:', backendResult);

          // Convert backend result to ModalityResult format
          const result: ModalityResult = {
            modality: 'voice',
            emotion: backendResult.emotion,
            confidence: Math.round(backendResult.confidence * 100),
            scores: (backendResult.scores || backendResult.all_scores || {})
              ? Object.entries(backendResult.scores || backendResult.all_scores).map(([emotion, confidence]: [string, any]) => ({
                  emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
                  confidence: Math.round(confidence * 100),
                }))
              : [],
          };

          setLastResult(result);
          setVoiceStatus('done');
          setWaveformData(Array(WAVEFORM_BARS).fill(4));
          resolve(result);
        } catch (err: any) {
          console.error('[Voice] Backend analysis error:', err);
          setVoiceStatus('error');
          setVoiceError(err.message || 'Voice analysis failed');
          setWaveformData(Array(WAVEFORM_BARS).fill(4));
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, [voiceStatus]);

  const resetVoice = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setVoiceStatus('idle');
    setVoiceError(null);
    setWaveformData(Array(WAVEFORM_BARS).fill(4));
    setAudioAnalysis(null);
    setLastResult(null);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    voiceStatus,
    voiceError,
    waveformData,
    audioAnalysis,
    lastResult,
    isRecording: voiceStatus === 'recording',
    startRecording,
    stopRecording,
    resetVoice,
  };
}
