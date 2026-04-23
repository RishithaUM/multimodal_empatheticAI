import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SummaryCards from './components/SummaryCards';
import LiveFeedPanel from './components/LiveFeedPanel';
import EmotionPanel from './components/EmotionPanel';
import RecentDetections from './components/RecentDetections';
import { useEmotionWebSocket } from '@/hooks/useEmotionWebSocket';
import { useGuardianAlert } from '@/hooks/useGuardianAlert';
import type { ModalityResult } from '@/services/emotionApi';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentEmotion, history, wsStatus, isConnected, connect, disconnect } = useEmotionWebSocket();
  const { activeAlert, unreadCount, dismissActive, evaluate } = useGuardianAlert();

  useEffect(() => {
    const savedUrl = localStorage.getItem('empathai_ws_url') || undefined;
    connect(savedUrl);
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (!currentEmotion) return;
    evaluate(currentEmotion, 'dashboard-session');
  }, [currentEmotion, evaluate]);

  const handleModalityResult = useCallback((_result: ModalityResult) => {}, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const wsStatusColor: Record<string, string> = {
    connecting: '#F59E0B',
    connected: '#00D4AA',
    disconnected: '#6B7280',
    error: '#EF4444',
    simulated: '#F59E0B',
  };
  const wsStatusLabel: Record<string, string> = {
    connecting: 'Connecting',
    connected: 'Live Stream',
    disconnected: 'Disconnected',
    error: 'Error',
    simulated: 'Simulated',
  };

  const statusColor = wsStatusColor[wsStatus] || '#6B7280';

  return (
    <div className="min-h-screen" style={{ background: '#07070E' }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                Dashboard
              </h1>
              {/* WS status pill */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: `${statusColor}12`,
                  border: `1px solid ${statusColor}30`,
                  color: statusColor,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: statusColor, animation: isConnected ? 'pulse 1.5s infinite' : 'none' }}
                />
                {wsStatusLabel[wsStatus] || wsStatus}
              </div>
            </div>
            <p className="text-gray-500 text-sm">{dateStr} · {timeStr}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Current emotion badge */}
            {currentEmotion && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', color: '#8B5CF6' }}
              >
                <i className="ri-emotion-line text-xs"></i>
                {currentEmotion.emotion} · {currentEmotion.confidence}%
              </div>
            )}

            {/* Alert badge */}
            {unreadCount > 0 && (
              <button
                onClick={() => navigate('/alerts')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
              >
                <i className="ri-alarm-warning-fill text-xs animate-pulse"></i>
                {unreadCount} Alert{unreadCount > 1 ? 's' : ''}
              </button>
            )}

            {/* New analysis CTA */}
            <button
              onClick={() => navigate('/analyze')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)' }}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-add-line text-xs"></i>
              </div>
              New Analysis
            </button>
          </div>
        </div>

        {/* ── Guardian Alert Banner ── */}
        {activeAlert && activeAlert.status !== 'dismissed' && (
          <div
            className="flex items-start justify-between gap-4 p-4 rounded-2xl mb-6"
            style={{
              background: activeAlert.severity === 'critical' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
              border: `1px solid ${activeAlert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: activeAlert.severity === 'critical' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i
                    className="ri-alarm-warning-fill text-sm animate-pulse"
                    style={{ color: activeAlert.severity === 'critical' ? '#EF4444' : '#F59E0B' }}
                  ></i>
                </div>
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  Guardian Alert — {activeAlert.emotion} detected
                </p>
                <p className="text-gray-400 text-xs mt-0.5">{activeAlert.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/alerts')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
                style={{
                  background: activeAlert.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color: activeAlert.severity === 'critical' ? '#EF4444' : '#F59E0B',
                }}
              >
                View Alerts
              </button>
              <button
                onClick={dismissActive}
                className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
              >
                <i className="ri-close-line text-xs text-gray-500"></i>
              </button>
            </div>
          </div>
        )}

        {/* ── Summary Cards ── */}
        <SummaryCards sessionCount={history.length} alertCount={unreadCount} />

        {/* ── Main 2-col grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">

          {/* Left — Live Feed (wider) */}
          <div className="lg:col-span-7">
            <LiveFeedPanel onModalityResult={handleModalityResult} />
          </div>

          {/* Right — Emotion Panel */}
          <div className="lg:col-span-5">
            <EmotionPanel fusedResult={currentEmotion} wsStatus={wsStatus} />
          </div>
        </div>

        {/* ── Recent Detections ── */}
        <RecentDetections history={history} />

      </div>
    </div>
  );
}
