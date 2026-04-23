import { emotionColors } from '@/mocks/emotions';
import type { FusedResult } from '@/services/emotionApi';

interface EmotionPanelProps {
  fusedResult: FusedResult | null;
  wsStatus: string;
}

const emotionEmoji: Record<string, string> = {
  Happy: '😊', Excited: '🤩', Calm: '😌', Sad: '😢',
  Anxious: '😰', Angry: '😠', Neutral: '😐', Fearful: '😨',
  Disgusted: '🤢', Surprised: '😲',
};

const DEFAULT_MODALITIES = [
  { modality: 'face', confidence: 0, emotion: 'Neutral', scores: [] },
  { modality: 'voice', confidence: 0, emotion: 'Neutral', scores: [] },
  { modality: 'text', confidence: 0, emotion: 'Neutral', scores: [] },
];

const modalityIconMap: Record<string, string> = {
  face: 'ri-camera-line', voice: 'ri-mic-line', text: 'ri-chat-3-line',
};
const modalityColorMap: Record<string, string> = {
  face: '#6C63FF', voice: '#00D4AA', text: '#EC4899',
};
const modalityLabelMap: Record<string, string> = {
  face: 'Face', voice: 'Voice', text: 'Text',
};

export default function EmotionPanel({ fusedResult, wsStatus }: EmotionPanelProps) {
  const emotion = fusedResult?.emotion || 'Neutral';
  const confidence = fusedResult?.confidence || 0;
  const intensity = fusedResult?.intensity || 0;
  const intensityLabel = fusedResult?.intensityLabel || 'Low';
  const emotionColor = emotionColors[emotion] || '#94A3B8';
  const intensityColor = intensityLabel === 'High' ? '#00D4AA' : intensityLabel === 'Medium' ? '#F59E0B' : '#6B7280';
  const emoji = emotionEmoji[emotion] || '🧠';

  const modalities = fusedResult?.modalities.length ? fusedResult.modalities : DEFAULT_MODALITIES;

  const isLive = wsStatus === 'connected' || wsStatus === 'simulated';
  const statusColor = wsStatus === 'connected' ? '#00D4AA' : wsStatus === 'simulated' ? '#F59E0B' : '#6B7280';
  const statusLabel = wsStatus === 'connected' ? 'Live' : wsStatus === 'simulated' ? 'Simulated' : 'Offline';

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Primary Emotion Card ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{ background: '#13131A', border: `1px solid ${emotionColor}25` }}
      >
        {/* Glow */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: emotionColor, opacity: 0.06, filter: 'blur(40px)' }}
        />

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">Current Emotion</p>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${statusColor}12`, color: statusColor, border: `1px solid ${statusColor}25` }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: statusColor, animation: isLive ? 'pulse 1.5s infinite' : 'none' }}
            />
            {statusLabel}
          </div>
        </div>

        {/* Emotion display */}
        <div className="flex items-center gap-4 mb-5">
          {/* Ring gauge */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
              <circle
                cx="48" cy="48" r="38"
                fill="none"
                stroke={emotionColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - confidence / 100)}`}
                style={{ filter: `drop-shadow(0 0 6px ${emotionColor}80)`, transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl">{emoji}</span>
              <span className="text-white text-xs font-bold">{confidence}%</span>
            </div>
          </div>

          {/* Emotion name + intensity */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-2xl font-black mb-1 truncate"
              style={{ color: emotionColor, fontFamily: 'Sora, sans-serif', textShadow: `0 0 20px ${emotionColor}30` }}
            >
              {emotion}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-500 text-xs">Intensity</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${intensityColor}18`, color: intensityColor }}
              >
                {intensityLabel}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${intensity}%`, background: `linear-gradient(to right, ${intensityColor}60, ${intensityColor})` }}
              />
            </div>
          </div>
        </div>

        {/* Fused output row */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: `${emotionColor}0D`, border: `1px solid ${emotionColor}20` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-cpu-line text-xs" style={{ color: emotionColor }}></i>
            </div>
            <span className="text-gray-400 text-xs">Fused output</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold" style={{ color: emotionColor }}>{emotion}</span>
            <span className="text-gray-600 text-xs">·</span>
            <span className="text-white text-sm font-bold">{confidence}%</span>
          </div>
        </div>
      </div>

      {/* ── Modality Confidence ── */}
      <div className="rounded-2xl p-5" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-bar-chart-grouped-line text-sm" style={{ color: '#6C63FF' }}></i>
          </div>
          <p className="text-white text-sm font-semibold">Confidence by Modality</p>
        </div>

        <div className="space-y-3">
          {modalities.map((m) => {
            const icon = modalityIconMap[m.modality] || 'ri-question-line';
            const color = modalityColorMap[m.modality] || '#6C63FF';
            const label = modalityLabelMap[m.modality] || m.modality;
            return (
              <div key={m.modality} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                      <div className="w-3 h-3 flex items-center justify-center">
                        <i className={`${icon} text-xs`} style={{ color }}></i>
                      </div>
                    </div>
                    <span className="text-gray-300 text-xs font-medium">{label}</span>
                    {m.emotion && m.emotion !== 'Neutral' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${color}15`, color: `${color}CC` }}>
                        {m.emotion}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold" style={{ color }}>{m.confidence}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${m.confidence}%`, background: `linear-gradient(to right, ${color}80, ${color})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="rounded-2xl p-4" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Full Analysis', icon: 'ri-brain-line', color: '#6C63FF', href: '/analyze' },
            { label: 'View History', icon: 'ri-history-line', color: '#00D4AA', href: '/history' },
            { label: 'AI Chat', icon: 'ri-chat-smile-3-line', color: '#EC4899', href: '/chat' },
            { label: 'Analytics', icon: 'ri-line-chart-line', color: '#F59E0B', href: '/analytics' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-80"
              style={{ background: `${action.color}0D`, border: `1px solid ${action.color}20` }}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className={`${action.icon} text-xs`} style={{ color: action.color }}></i>
              </div>
              <span className="text-xs font-medium" style={{ color: action.color }}>{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
