import type { FusedResult } from '@/services/emotionApi';

const emotionColors: Record<string, string> = {
  Happy: '#00D4AA', Sad: '#6C63FF', Anxious: '#F59E0B', Angry: '#EF4444',
  Neutral: '#94A3B8', Excited: '#EC4899', Calm: '#3B82F6', Fearful: '#8B5CF6',
  Disgusted: '#10B981', Surprised: '#F97316',
};

interface ChatHeaderProps {
  currentEmotion: FusedResult | null;
  wsStatus: string;
  messageCount: number;
  onClearChat: () => void;
  onExportChat: () => void;
}

const wsStatusConfig: Record<string, { color: string; label: string }> = {
  connecting: { color: '#F59E0B', label: 'Connecting' },
  connected: { color: '#00D4AA', label: 'Live' },
  disconnected: { color: '#6B7280', label: 'Offline' },
  error: { color: '#EF4444', label: 'Error' },
  simulated: { color: '#F59E0B', label: 'Simulated' },
};

export default function ChatHeader({ currentEmotion, wsStatus, messageCount, onClearChat, onExportChat }: ChatHeaderProps) {
  const statusCfg = wsStatusConfig[wsStatus] || wsStatusConfig.disconnected;
  const emotionColor = currentEmotion ? (emotionColors[currentEmotion.emotion] || '#6C63FF') : '#6C63FF';

  return (
    <div
      className="flex items-center justify-between px-6 py-4 flex-shrink-0"
      style={{ background: '#0D0D14', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Left — AI identity */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-robot-line text-white text-lg"></i>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-semibold">EmpathAI Assistant</p>
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.color}30`, color: statusCfg.color }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: statusCfg.color, animation: wsStatus === 'connected' || wsStatus === 'simulated' ? 'pulse 1.5s infinite' : 'none' }}
              />
              {statusCfg.label}
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-0.5">
            Emotion-aware · {messageCount} message{messageCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Center — Current emotion */}
      {currentEmotion && (
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: `${emotionColor}12`, border: `1px solid ${emotionColor}25`, color: emotionColor }}
        >
          <div className="w-3 h-3 flex items-center justify-center">
            <i className="ri-emotion-line text-xs"></i>
          </div>
          Detected: {currentEmotion.emotion} · {currentEmotion.confidence}%
        </div>
      )}

      {/* Right — Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExportChat}
          className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors hover:bg-white/5"
          title="Export chat"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-download-line text-gray-400 text-sm"></i>
          </div>
        </button>
        <button
          onClick={onClearChat}
          className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors hover:bg-white/5"
          title="Clear chat"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-delete-bin-line text-gray-400 text-sm"></i>
          </div>
        </button>
      </div>
    </div>
  );
}
