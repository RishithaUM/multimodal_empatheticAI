import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useVoiceAnalysis } from '@/hooks/useVoiceAnalysis';
import { useTextAnalysis } from '@/hooks/useTextAnalysis';
import type { ModalityResult } from '@/services/emotionApi';

interface LiveFeedPanelProps {
  onModalityResult?: (result: ModalityResult) => void;
}

type ActiveTab = 'face' | 'voice' | 'text';

export default function LiveFeedPanel({ onModalityResult }: LiveFeedPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('face');

  const {
    videoRef,
    cameraStatus,
    cameraError,
    lastResult: faceResult,
    startCamera,
    stopCamera,
    captureFrame,
  } = useFaceDetection(true, 2500);

  const {
    voiceStatus,
    voiceError,
    waveformData,
    lastResult: voiceResult,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceAnalysis();

  const {
    text,
    setText,
    lastResult: textResult,
    analyzeText,
    charCount,
  } = useTextAnalysis();

  const prevFaceRef = useRef<ModalityResult | null>(null);
  const prevVoiceRef = useRef<ModalityResult | null>(null);
  const prevTextRef = useRef<ModalityResult | null>(null);

  useEffect(() => {
    if (faceResult && faceResult !== prevFaceRef.current) {
      prevFaceRef.current = faceResult;
      onModalityResult?.(faceResult);
    }
  }, [faceResult, onModalityResult]);

  useEffect(() => {
    if (voiceResult && voiceResult !== prevVoiceRef.current) {
      prevVoiceRef.current = voiceResult;
      onModalityResult?.(voiceResult);
    }
  }, [voiceResult, onModalityResult]);

  useEffect(() => {
    if (textResult && textResult !== prevTextRef.current) {
      prevTextRef.current = textResult;
      onModalityResult?.(textResult);
    }
  }, [textResult, onModalityResult]);

  const handleVoiceToggle = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleAnalyze = async () => {
    const results: ModalityResult[] = [];
    if (cameraStatus === 'active') {
      const r = await captureFrame();
      if (r) results.push(r);
    }
    if (voiceResult) results.push(voiceResult);
    const textR = analyzeText();
    if (textR) results.push(textR);
    navigate('/results', { state: { results } });
  };

  const tabs: { id: ActiveTab; label: string; icon: string; color: string; result: ModalityResult | null }[] = [
    { id: 'face', label: 'Face', icon: 'ri-camera-line', color: '#6C63FF', result: faceResult },
    { id: 'voice', label: 'Voice', icon: 'ri-mic-line', color: '#00D4AA', result: voiceResult },
    { id: 'text', label: 'Text', icon: 'ri-chat-3-line', color: '#EC4899', result: textResult },
  ];

  const voiceStatusConfig: Record<string, { label: string; color: string; icon: string }> = {
    idle: { label: 'Idle', color: '#94A3B8', icon: 'ri-mic-line' },
    requesting: { label: 'Requesting...', color: '#F59E0B', icon: 'ri-loader-4-line' },
    recording: { label: 'Recording', color: '#EF4444', icon: 'ri-mic-fill' },
    processing: { label: 'Processing...', color: '#F59E0B', icon: 'ri-loader-4-line' },
    done: { label: 'Done', color: '#00D4AA', icon: 'ri-check-line' },
    error: { label: 'Error', color: '#EF4444', icon: 'ri-error-warning-line' },
    unsupported: { label: 'Unsupported', color: '#6B7280', icon: 'ri-close-line' },
  };
  const vs = voiceStatusConfig[voiceStatus] ?? voiceStatusConfig.idle;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Tab switcher card ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Tab bar */}
        <div className="flex items-center gap-1 p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all"
              style={{
                background: activeTab === tab.id ? `${tab.color}18` : 'transparent',
                color: activeTab === tab.id ? tab.color : '#6B7280',
                border: activeTab === tab.id ? `1px solid ${tab.color}30` : '1px solid transparent',
              }}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                <i className={`${tab.icon} text-xs`}></i>
              </div>
              {tab.label}
              {tab.result && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: tab.color }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Face tab ── */}
        {activeTab === 'face' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {faceResult && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(108,99,255,0.12)', color: '#8B5CF6' }}>
                    {faceResult.emotion} · {faceResult.confidence}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {cameraStatus === 'active' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-red-400 text-xs font-bold">LIVE</span>
                    <button
                      onClick={stopCamera}
                      className="text-xs px-2.5 py-1 rounded-lg cursor-pointer whitespace-nowrap transition-all"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      Stop
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startCamera}
                    disabled={cameraStatus === 'requesting'}
                    className="text-xs px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'rgba(108,99,255,0.15)', color: '#8B5CF6', border: '1px solid rgba(108,99,255,0.3)' }}
                  >
                    {cameraStatus === 'requesting' ? 'Starting...' : 'Start Camera'}
                  </button>
                )}
              </div>
            </div>

            {/* Camera preview */}
            <div className="relative rounded-xl overflow-hidden" style={{ height: '220px', background: '#0A0A12' }}>
              <video
                ref={videoRef}
                autoPlay muted playsInline
                className="w-full h-full object-cover"
                style={{ display: cameraStatus === 'active' ? 'block' : 'none' }}
              />
              {cameraStatus !== 'active' && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  {cameraStatus === 'error' ? (
                    <>
                      <div className="w-10 h-10 flex items-center justify-center rounded-full" style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <i className="ri-camera-off-line text-xl text-red-400"></i>
                      </div>
                      <p className="text-red-400 text-xs text-center px-6">{cameraError}</p>
                    </>
                  ) : cameraStatus === 'requesting' ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-2xl" style={{ color: '#8B5CF6' }}></i>
                      <p className="text-gray-500 text-xs">Requesting camera...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)' }}>
                        <i className="ri-camera-line text-2xl" style={{ color: 'rgba(108,99,255,0.5)' }}></i>
                      </div>
                      <p className="text-gray-600 text-xs">Click Start Camera to begin</p>
                    </>
                  )}
                </div>
              )}
              {/* Overlay when active */}
              {cameraStatus === 'active' && (
                <>
                  {faceResult && (
                    <div
                      className="absolute"
                      style={{ top: '10%', left: '30%', width: '40%', height: '70%', border: '2px solid #6C63FF', borderRadius: '6px' }}
                    >
                      <div className="absolute -top-6 left-0 text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#6C63FF', color: '#fff' }}>
                        {faceResult.emotion} {faceResult.confidence}%
                      </div>
                    </div>
                  )}
                  {/* Corner brackets */}
                  {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos) => (
                    <div key={pos} className={`absolute ${pos} w-4 h-4 pointer-events-none`} style={{ border: '2px solid rgba(108,99,255,0.5)', borderRadius: '2px' }} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Voice tab ── */}
        {activeTab === 'voice' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: vs.color, boxShadow: isRecording ? `0 0 8px ${vs.color}` : 'none' }} />
                <span className="text-xs font-medium" style={{ color: vs.color }}>{vs.label}</span>
                {voiceResult && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA' }}>
                    {voiceResult.emotion} · {voiceResult.confidence}%
                  </span>
                )}
              </div>
              <button
                onClick={handleVoiceToggle}
                disabled={voiceStatus === 'requesting' || voiceStatus === 'processing' || voiceStatus === 'unsupported'}
                className="text-xs px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-all disabled:opacity-50"
                style={{
                  background: isRecording ? 'rgba(239,68,68,0.12)' : 'rgba(0,212,170,0.12)',
                  color: isRecording ? '#EF4444' : '#00D4AA',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.25)' : 'rgba(0,212,170,0.25)'}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <i className={`${vs.icon} text-xs ${voiceStatus === 'processing' || voiceStatus === 'requesting' ? 'animate-spin' : ''}`}></i>
                  {isRecording ? 'Stop' : voiceStatus === 'processing' ? 'Processing...' : 'Record'}
                </div>
              </button>
            </div>

            {/* Waveform */}
            <div className="rounded-xl overflow-hidden" style={{ height: '220px', background: '#0A0A12', border: '1px solid rgba(0,212,170,0.08)' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-xs font-mono" style={{ color: isRecording ? '#EF4444' : '#4B5563' }}>
                  {isRecording ? '● REC' : '○ IDLE'}
                </span>
                <span className="text-xs" style={{ color: 'rgba(0,212,170,0.4)' }}>WAVEFORM</span>
              </div>
              <div className="flex items-center justify-center gap-1 px-4" style={{ height: '170px' }}>
                {waveformData.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-all"
                    style={{
                      height: `${Math.max(4, h)}px`,
                      maxHeight: '140px',
                      background: isRecording
                        ? `linear-gradient(to top, #00D4AA44, #00D4AA)`
                        : 'rgba(255,255,255,0.07)',
                      transitionDuration: '60ms',
                    }}
                  />
                ))}
              </div>
            </div>
            {voiceError && <p className="text-red-400 text-xs mt-2">{voiceError}</p>}
          </div>
        )}

        {/* ── Text tab ── */}
        {activeTab === 'text' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {textResult && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(236,72,153,0.12)', color: '#EC4899' }}>
                    {textResult.emotion} · {textResult.confidence}%
                  </span>
                )}
              </div>
              <span className="text-gray-600 text-xs">{charCount}/500</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe how you're feeling for sentiment analysis..."
              rows={5}
              maxLength={500}
              className="w-full rounded-xl text-sm text-white placeholder-gray-600 outline-none resize-none mb-3"
              style={{
                background: '#0A0A12',
                border: '1px solid rgba(236,72,153,0.15)',
                padding: '12px 14px',
                fontSize: '13px',
                lineHeight: '1.6',
                height: '160px',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(236,72,153,0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(236,72,153,0.15)')}
            />
            <button
              onClick={() => analyzeText()}
              disabled={!text.trim()}
              className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all disabled:opacity-40"
              style={{ background: 'rgba(236,72,153,0.12)', color: '#EC4899', border: '1px solid rgba(236,72,153,0.2)' }}
            >
              Analyze Sentiment
            </button>
          </div>
        )}
      </div>

      {/* ── Analyze CTA ── */}
      <button
        onClick={handleAnalyze}
        className="w-full py-4 rounded-2xl text-sm font-bold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
          boxShadow: '0 4px 24px rgba(108,99,255,0.25)',
        }}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-brain-line text-sm"></i>
        </div>
        Run Full Emotion Analysis
        <span className="text-xs font-normal opacity-60">→ Results</span>
      </button>
    </div>
  );
}
