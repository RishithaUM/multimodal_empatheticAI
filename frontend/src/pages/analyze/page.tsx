import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useVoiceAnalysis } from '@/hooks/useVoiceAnalysis';
import { useTextAnalysis } from '@/hooks/useTextAnalysis';
import { fuseEmotions } from '@/services/emotionApi';
import type { ModalityResult } from '@/services/emotionApi';

// ── Timer hook ────────────────────────────────────────────────────────────────
function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      setSeconds(0);
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const reset = () => setSeconds(0);
  return { seconds, reset };
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Simple bar waveform visualizer ───────────────────────────────────────────
function WaveformBars({ data, active, color }: { data: number[]; active: boolean; color: string }) {
  const maxVal = Math.max(...data, 1);
  const BAR_MAX_H = 280; // Taller bars to fill the 340px container

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Level indicator */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color: active && maxVal > 10 ? color : 'rgba(255,255,255,0.25)' }}>
          {active ? (maxVal > 10 ? '● LIVE' : '○ Waiting for audio...') : '○ Idle'}
        </span>
        {active && (
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {maxVal.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Bars - centered vertically */}
      <div className="flex items-center justify-center gap-1.5" style={{ height: `${BAR_MAX_H}px` }}>
        {data.map((val, i) => {
          // More sensitive scaling - even small values show movement
          const normalized = Math.max(0, val - 5); // Subtract noise floor
          const height = Math.max(8, Math.min(BAR_MAX_H, (normalized / 100) * BAR_MAX_H * 1.2));
          const isActive = active && val > 8;
          
          return (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: '10px',
                height: `${height}px`,
                background: active
                  ? `linear-gradient(to top, ${color}22, ${color}88, ${color})`
                  : 'rgba(255,255,255,0.06)',
                boxShadow: isActive ? `0 0 12px ${color}66, 0 0 24px ${color}33` : 'none',
                transitionDuration: '50ms',
                opacity: isActive ? 1 : 0.5,
              }}
            />
          );
        })}
      </div>

      {/* Mic icon hint when idle */}
      {!active && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="w-12 h-12 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.15)' }}>
            <i className="ri-mic-line text-xl" style={{ color: 'rgba(0,212,170,0.4)' }}></i>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Press Start to begin recording</p>
        </div>
      )}
    </div>
  );
}

// ── Emotion badge removed — emotion only revealed on Results page ─────────────

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ active, pulse }: { active: boolean; pulse?: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{
        background: active ? '#00D4AA' : '#374151',
        boxShadow: active && pulse ? '0 0 0 0 #00D4AA' : 'none',
        animation: active && pulse ? 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' : 'none',
      }}
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const navigate = useNavigate();

  // ── Face ──────────────────────────────────────────────────────────────────
  const {
    videoRef,
    cameraStatus,
    cameraError,
    lastResult: faceResult,
    startCamera,
    stopCamera,
    captureFrame,
    captureMultiFrame,
  } = useFaceDetection(false);

  const [faceRecording, setFaceRecording] = useState(false);
  const [faceDone, setFaceDone] = useState(false);
  const [capturedFaceResult, setCapturedFaceResult] = useState<ModalityResult | null>(null);
  const faceTimer = useTimer(faceRecording);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const {
    voiceStatus,
    voiceError,
    waveformData,
    lastResult: voiceResult,
    isRecording: voiceIsRecording,
    startRecording,
    stopRecording,
    resetVoice,
  } = useVoiceAnalysis();

  const [voiceDone, setVoiceDone] = useState(false);
  const [capturedVoiceResult, setCapturedVoiceResult] = useState<ModalityResult | null>(null);
  const voiceTimer = useTimer(voiceIsRecording);

  // ── Text ──────────────────────────────────────────────────────────────────
  const { text, setText, lastResult: textResult, analyzeText, charCount } = useTextAnalysis();
  const [textEnabled, setTextEnabled] = useState(false);

  // ── Analysis state ────────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');

  // ── Face handlers ─────────────────────────────────────────────────────────
  const handleStartFace = async () => {
    setFaceDone(false);
    setCapturedFaceResult(null);
    await startCamera();
    setFaceRecording(true);
  };

  const handleStopFace = async () => {
    setFaceRecording(false);
    // Use multi-frame detection: capture 40 frames over 4 seconds for better accuracy
    const result = await captureMultiFrame({ samplingInterval: 100, maxFrames: 40 });
    setCapturedFaceResult(result);
    setFaceDone(true);
    stopCamera();
  };

  // ── Voice handlers ────────────────────────────────────────────────────────
  const handleStartVoice = async () => {
    setVoiceDone(false);
    setCapturedVoiceResult(null);
    await startRecording();
  };

  const handleStopVoice = async () => {
    const result = await stopRecording();
    if (result) {
      setCapturedVoiceResult(result);
      setVoiceDone(true);
    }
  };

  // ── Analyze ───────────────────────────────────────────────────────────────
  const hasAnyInput = faceDone || voiceDone || (textEnabled && text.trim().length > 0);
  const isCapturing = faceRecording || voiceIsRecording;

  const handleAnalyze = useCallback(async () => {
    if (!hasAnyInput || isAnalyzing || isCapturing) return;

    setIsAnalyzing(true);
    const results: ModalityResult[] = [];

    // Face
    if (capturedFaceResult) {
      setAnalysisStep('Processing facial expressions...');
      await new Promise((r) => setTimeout(r, 400));
      results.push(capturedFaceResult);
    }

    // Voice
    if (capturedVoiceResult) {
      setAnalysisStep('Processing voice audio...');
      await new Promise((r) => setTimeout(r, 400));
      results.push(capturedVoiceResult);
    }

    // Text
    if (textEnabled && text.trim()) {
      setAnalysisStep('Analyzing text sentiment...');
      await new Promise((r) => setTimeout(r, 300));
      const r = analyzeText();
      if (r) results.push(r);
    }

    setAnalysisStep('Fusing multimodal results...');
    await new Promise((r) => setTimeout(r, 600));

    const fused = fuseEmotions(results);
    setIsAnalyzing(false);
    setAnalysisStep('');

    navigate('/results', { state: { fused, modalities: results } });
  }, [
    hasAnyInput, isAnalyzing, isCapturing,
    capturedFaceResult, capturedVoiceResult,
    textEnabled, text, analyzeText, navigate,
  ]);

  // ── Collected inputs summary ──────────────────────────────────────────────
  const collectedCount = [
    capturedFaceResult,
    capturedVoiceResult,
    textEnabled && text.trim() ? true : null,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Analyze Emotion
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Record your face and voice, optionally add text — then click Analyze to get your fused emotion result.
          </p>
        </div>

        <div className="space-y-5">

          {/* ── FACE SECTION ─────────────────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#13131A',
              border: `1px solid ${faceDone ? 'rgba(108,99,255,0.4)' : faceRecording ? 'rgba(108,99,255,0.6)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: faceRecording ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.05)' }}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-camera-line text-base" style={{ color: faceRecording || faceDone ? '#8B5CF6' : '#6B7280' }}></i>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">Face Recording</span>
                    {faceRecording && (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#EF4444' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span>
                        REC
                      </span>
                    )}
                    {faceDone && !faceRecording && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA' }}>
                        <i className="ri-check-line mr-1"></i>Captured
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {faceRecording
                      ? `Recording... ${formatTime(faceTimer.seconds)}`
                      : faceDone
                      ? `Recorded ${formatTime(faceTimer.seconds)} · Ready`
                      : 'Webcam facial expression analysis'}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {!faceRecording && !faceDone && cameraStatus === 'idle' && (
                  <button
                    onClick={handleStartFace}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(108,99,255,0.15)', color: '#8B5CF6', border: '1px solid rgba(108,99,255,0.3)' }}
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-play-fill text-xs"></i>
                    </div>
                    Start
                  </button>
                )}
                {faceRecording && (
                  <button
                    onClick={handleStopFace}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-90"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-stop-fill text-xs"></i>
                    </div>
                    Stop · {formatTime(faceTimer.seconds)}
                  </button>
                )}
                {faceDone && !faceRecording && (
                  <button
                    onClick={handleStartFace}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-refresh-line text-xs"></i>
                    </div>
                    Redo
                  </button>
                )}
              </div>
            </div>

            {/* Camera preview */}
            {(faceRecording || cameraStatus === 'requesting' || cameraStatus === 'active') && (
              <div className="px-5 pb-5">
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{ height: '340px', background: '#0D0D14' }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ display: cameraStatus === 'active' ? 'block' : 'none' }}
                  />
                  {cameraStatus !== 'active' && (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      {cameraStatus === 'requesting' ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-2xl mb-2" style={{ color: '#8B5CF6' }}></i>
                          <p className="text-gray-400 text-xs">Starting camera...</p>
                        </>
                      ) : cameraStatus === 'error' ? (
                        <>
                          <i className="ri-camera-off-line text-2xl text-red-400 mb-2"></i>
                          <p className="text-red-400 text-xs text-center px-4">{cameraError}</p>
                        </>
                      ) : null}
                    </div>
                  )}

                  {/* Recording overlay */}
                  {faceRecording && cameraStatus === 'active' && (
                    <>
                      {/* Timer badge */}
                      <div
                        className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', backdropFilter: 'blur(4px)' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span>
                        {formatTime(faceTimer.seconds)}
                      </div>
                      {/* Face box hint */}
                      <div
                        className="absolute"
                        style={{
                          top: '15%', left: '30%', width: '40%', height: '65%',
                          border: '2px solid rgba(108,99,255,0.6)',
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          className="absolute -top-5 left-0 text-xs px-2 py-0.5 rounded font-medium"
                          style={{ background: '#6C63FF', color: '#fff' }}
                        >
                          Face detected
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Done state preview */}
            {faceDone && !faceRecording && (
              <div className="px-5 pb-5">
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(108,99,255,0.15)' }}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-check-line text-sm" style={{ color: '#8B5CF6' }}></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">Face data captured</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatTime(faceTimer.seconds)} recorded · result will appear after analysis
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── VOICE SECTION ─────────────────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#13131A',
              border: `1px solid ${voiceDone ? 'rgba(0,212,170,0.4)' : voiceIsRecording ? 'rgba(0,212,170,0.6)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: voiceIsRecording ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.05)' }}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-mic-line text-base" style={{ color: voiceIsRecording || voiceDone ? '#00D4AA' : '#6B7280' }}></i>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">Voice Recording</span>
                    {voiceIsRecording && (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#EF4444' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span>
                        REC
                      </span>
                    )}
                    {voiceDone && !voiceIsRecording && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA' }}>
                        <i className="ri-check-line mr-1"></i>Captured
                      </span>
                    )}
                    {voiceStatus === 'processing' && (
                      <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>
                        <i className="ri-loader-4-line animate-spin mr-1"></i>Processing...
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {voiceIsRecording
                      ? `Recording... ${formatTime(voiceTimer.seconds)}`
                      : voiceDone
                      ? `Recorded ${formatTime(voiceTimer.seconds)} · Ready`
                      : voiceStatus === 'processing'
                      ? 'Analyzing audio...'
                      : 'Microphone tone & pitch analysis'}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {!voiceIsRecording && !voiceDone && voiceStatus !== 'processing' && (
                  <button
                    onClick={handleStartVoice}
                    disabled={isAnalyzing || voiceStatus === 'requesting'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.3)' }}
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className={`${voiceStatus === 'requesting' ? 'ri-loader-4-line animate-spin' : 'ri-play-fill'} text-xs`}></i>
                    </div>
                    {voiceStatus === 'requesting' ? 'Starting...' : 'Start'}
                  </button>
                )}
                {voiceIsRecording && (
                  <button
                    onClick={handleStopVoice}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-90"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-stop-fill text-xs"></i>
                    </div>
                    Stop · {formatTime(voiceTimer.seconds)}
                  </button>
                )}
                {voiceDone && !voiceIsRecording && voiceStatus !== 'processing' && (
                  <button
                    onClick={() => {
                      setVoiceDone(false);
                      setCapturedVoiceResult(null);
                      resetVoice();
                    }}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="w-3 h-3 flex items-center justify-center">
                      <i className="ri-refresh-line text-xs"></i>
                    </div>
                    Redo
                  </button>
                )}
              </div>
            </div>

            {/* Waveform area */}
            {(voiceIsRecording || voiceStatus === 'processing' || voiceStatus === 'requesting') && (
              <div className="px-5 pb-5">
                <div
                  className="rounded-xl overflow-hidden flex flex-col"
                  style={{ height: '340px', background: '#0A0A12', border: '1px solid rgba(0,212,170,0.12)' }}
                >
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2">
                      {voiceIsRecording && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"></span>
                      )}
                      <span className="text-xs font-mono font-bold" style={{ color: voiceIsRecording ? '#EF4444' : '#6B7280' }}>
                        {voiceIsRecording ? formatTime(voiceTimer.seconds) : 'Processing...'}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(0,212,170,0.5)' }}>LIVE WAVEFORM</span>
                  </div>
                  {/* Waveform — fills remaining height */}
                  <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
                    <WaveformBars data={waveformData} active={voiceIsRecording} color="#00D4AA" />
                  </div>
                </div>
              </div>
            )}

            {/* Done state */}
            {voiceDone && !voiceIsRecording && (
              <div className="px-5 pb-5">
                <div
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.15)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,212,170,0.12)' }}
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-check-line text-sm" style={{ color: '#00D4AA' }}></i>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">Voice data captured</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatTime(voiceTimer.seconds)} recorded · result will appear after analysis
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── TEXT SECTION ──────────────────────────────────────────────── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: '#13131A',
              border: `1px solid ${textEnabled && text.trim() ? 'rgba(236,72,153,0.4)' : textEnabled ? 'rgba(236,72,153,0.25)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: textEnabled ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.05)' }}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-chat-3-line text-base" style={{ color: textEnabled ? '#EC4899' : '#6B7280' }}></i>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">Text Input</span>
                    <span className="text-xs text-gray-600">(optional)</span>
                    {textEnabled && text.trim() && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(236,72,153,0.12)', color: '#EC4899' }}>
                        <i className="ri-check-line mr-1"></i>Ready
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">Natural language sentiment analysis</p>
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => setTextEnabled((v) => !v)}
                disabled={isAnalyzing}
                className="cursor-pointer transition-all disabled:opacity-50"
              >
                <div
                  className="w-10 h-5 rounded-full relative transition-all"
                  style={{ background: textEnabled ? '#EC4899' : 'rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: textEnabled ? '22px' : '2px' }}
                  />
                </div>
              </button>
            </div>

            {textEnabled && (
              <div className="px-5 pb-5">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type how you're feeling, describe your current emotional state, or write anything for sentiment analysis..."
                  rows={4}
                  maxLength={500}
                  disabled={isAnalyzing}
                  className="w-full rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none disabled:opacity-50"
                  style={{
                    background: '#0D0D14',
                    border: '1px solid rgba(236,72,153,0.2)',
                    padding: '12px 14px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(236,72,153,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(236,72,153,0.2)')}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-gray-600 text-xs">
                    {text.trim().split(/\s+/).filter(Boolean).length} words
                  </p>
                  <p className="text-gray-600 text-xs">{charCount}/500</p>
                </div>
              </div>
            )}
          </div>

          {/* ── INPUTS SUMMARY ────────────────────────────────────────────── */}
          {collectedCount > 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-gray-500 text-xs">Ready to analyze:</span>
              {capturedFaceResult && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(108,99,255,0.12)', color: '#8B5CF6' }}>
                  <i className="ri-camera-line text-xs"></i>
                  Face captured
                </span>
              )}
              {capturedVoiceResult && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA' }}>
                  <i className="ri-mic-line text-xs"></i>
                  Voice captured
                </span>
              )}
              {textEnabled && text.trim() && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(236,72,153,0.12)', color: '#EC4899' }}>
                  <i className="ri-chat-3-line text-xs"></i>
                  Text · {text.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              )}
              <span className="ml-auto text-xs text-gray-600">
                {collectedCount} input{collectedCount > 1 ? 's' : ''} · fusion will be {collectedCount > 1 ? 'more precise' : 'single-modal'}
              </span>
            </div>
          )}

          {/* ── ANALYZE BUTTON ────────────────────────────────────────────── */}
          <button
            onClick={handleAnalyze}
            disabled={!hasAnyInput || isAnalyzing || isCapturing}
            className="w-full py-5 rounded-2xl text-base font-bold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            style={{
              background: hasAnyInput && !isCapturing
                ? 'linear-gradient(135deg, #6C63FF, #8B5CF6)'
                : '#1C1C28',
              boxShadow: hasAnyInput && !isCapturing ? '0 8px 32px rgba(108,99,255,0.3)' : 'none',
            }}
          >
            {isAnalyzing ? (
              <>
                <i className="ri-loader-4-line animate-spin text-lg"></i>
                {analysisStep || 'Analyzing...'}
              </>
            ) : isCapturing ? (
              <>
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-record-circle-line text-lg text-red-400"></i>
                </div>
                Stop recording first
              </>
            ) : !hasAnyInput ? (
              <>
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-scan-line text-lg"></i>
                </div>
                Record face or voice to begin
              </>
            ) : (
              <>
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className="ri-brain-line text-lg"></i>
                </div>
                Analyze Emotion
                {collectedCount > 1 && (
                  <span className="text-xs font-normal opacity-70">
                    · {collectedCount}-modal fusion
                  </span>
                )}
              </>
            )}
          </button>

          {/* Hint */}
          {!hasAnyInput && !isCapturing && (
            <p className="text-center text-gray-600 text-xs">
              Start by recording your face or voice above. Text is optional but improves accuracy.
            </p>
          )}
          {isCapturing && (
            <p className="text-center text-xs" style={{ color: '#F59E0B' }}>
              <i className="ri-information-line mr-1"></i>
              Stop your recording before analyzing
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
