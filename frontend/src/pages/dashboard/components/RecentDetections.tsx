import { useNavigate } from 'react-router-dom';
import { emotionColors, recentDetections } from '@/mocks/emotions';
import type { EmotionHistoryEntry } from '@/hooks/useEmotionWebSocket';

interface RecentDetectionsProps {
  history?: EmotionHistoryEntry[];
}

const modalityIcon: Record<string, string> = {
  face: 'ri-camera-line',
  voice: 'ri-mic-line',
  text: 'ri-chat-3-line',
};

const modalityColor: Record<string, string> = {
  face: '#6C63FF',
  voice: '#00D4AA',
  text: '#EC4899',
};

export default function RecentDetections({ history = [] }: RecentDetectionsProps) {
  const navigate = useNavigate();

  const items = history.length > 0
    ? history.slice(0, 8).map((h) => ({
        id: h.id,
        time: new Date(h.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        emotion: h.emotion,
        confidence: h.confidence,
        inputs: h.modalities.map((m) => m.modality),
        isLive: true,
      }))
    : recentDetections.map((d) => ({ ...d, isLive: false }));

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.1)' }}>
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-history-line text-xs" style={{ color: '#00D4AA' }}></i>
            </div>
          </div>
          <p className="text-white text-sm font-semibold">Recent Detections</p>
          {history.length > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse inline-block"></span>
              Live
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
          style={{ color: '#6B7280' }}
        >
          View all
          <i className="ri-arrow-right-line text-xs"></i>
        </button>
      </div>

      {/* Grid of detection cards */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {items.map((d) => {
          const color = emotionColors[d.emotion] || '#6C63FF';
          return (
            <div
              key={d.id}
              className="rounded-xl p-3 flex flex-col gap-2.5 cursor-pointer transition-all hover:scale-[1.02]"
              style={{
                background: `${color}08`,
                border: `1px solid ${color}20`,
              }}
            >
              {/* Time + confidence */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">{d.time}</span>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${color}18`, color }}
                >
                  {d.confidence}%
                </span>
              </div>

              {/* Emotion name */}
              <p
                className="text-sm font-black leading-tight"
                style={{ color, fontFamily: 'Sora, sans-serif' }}
              >
                {d.emotion}
              </p>

              {/* Confidence mini bar */}
              <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${d.confidence}%`, background: color }}
                />
              </div>

              {/* Modality icons */}
              <div className="flex gap-1">
                {d.inputs.map((inp) => (
                  <div
                    key={inp}
                    className="w-5 h-5 flex items-center justify-center rounded-full"
                    style={{ background: `${modalityColor[inp] || '#6C63FF'}18` }}
                    title={inp}
                  >
                    <i
                      className={`${modalityIcon[inp] || 'ri-question-line'} text-xs`}
                      style={{ color: modalityColor[inp] || '#6C63FF' }}
                    ></i>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
