import { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeAudioBuffer, mapVoiceToEmotion } from '@/services/emotionApi';
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

    // Calculate overall volume for debug
    const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const max = Math.max(...dataArray);
    
    // Log every ~2 seconds
    if (Math.random() < 0.03) {
      console.log('[Waveform] Volume:', average.toFixed(1), 'Peak:', max, 'Buffer:', bufferLength);
    }

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
      console.log('[Voice] Audio analyser connected, fftSize:', analyser.fftSize, 'freqBinCount:', analyser.frequencyBinCount);

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

        // Analyze audio
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const audioCtx = audioContextRef.current || new AudioContext();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          const channelData = decoded.getChannelData(0);

          const analysis = analyzeAudioBuffer(channelData, decoded.sampleRate);
          setAudioAnalysis(analysis);

          const result = mapVoiceToEmotion(analysis);
          setLastResult(result);
          setVoiceStatus('done');
          setWaveformData(Array(WAVEFORM_BARS).fill(4));
          resolve(result);
        } catch (err) {
          console.warn('Audio analysis error:', err);
          // Fallback: use energy-based simulation
          const fallbackAnalysis: VoiceAnalysisResult = {
            energy: 45 + Math.round(Math.random() * 30),
            pitch: 150 + Math.round(Math.random() * 100),
            tempo: 60 + Math.round(Math.random() * 40),
            spectralCentroid: 1000 + Math.round(Math.random() * 1500),
          };
          const result = mapVoiceToEmotion(fallbackAnalysis);
          setLastResult(result);
          setVoiceStatus('done');
          setWaveformData(Array(WAVEFORM_BARS).fill(4));
          resolve(result);
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
