import type { FusedResult } from '@/services/emotionApi';
import { emotionColors } from '@/mocks/emotions';

interface EmotionContextBarProps {
  currentEmotion: FusedResult | null;
}

const emotionEmoji: Record<string, string> = {
  Happy: '😊', Excited: '🤩', Calm: '😌', Sad: '😢',
  Anxious: '😰', Angry: '😠', Neutral: '😐', Fearful: '😨',
  Disgusted: '🤢', Surprised: '😲',
};

const modalityIconMap: Record<string, string> = {
  face: 'ri-camera-line',
  voice: 'ri-mic-line',
  text: 'ri-chat-3-line',
};

const modalityColorMap: Record<string, string> = {
  face: '#6C63FF',
  voice: '#00D4AA',
  text: '#EC4899',
};

export default function EmotionContextBar({ currentEmotion }: EmotionContextBarProps) {
  if (!currentEmotion) {
    return (
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
        style={{ background: '#0A0A12', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <i className="ri-emotion-line text-gray-600 text-sm"></i>
        </div>
        <p className="text-gray-600 text-xs">No emotion detected yet — run an analysis to connect real data</p>
        <a
          href="/analyze"
          className="ml-auto text-xs font-semibold px-3 py-1 rounded-full cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
          style={{ background: 'rgba(108,99,255,0.15)', color: '#8B5CF6', border: '1px solid rgba(108,99,255,0.25)' }}
        >
          Run Analysis
        </a>
      </div>
    );
  }

  const emotionColor = emotionColors[currentEmotion.emotion] || '#6C63FF';
  const emoji = emotionEmoji[currentEmotion.emotion] || '🧠';
  const intensityColor = currentEmotion.intensityLabel === 'High' ? '#00D4AA' : currentEmotion.intensityLabel === 'Medium' ? '#F59E0B' : '#3B82F6';

  return (
    <div
      className="flex items-center gap-4 px-6 py-2.5 flex-shrink-0 overflow-x-auto"
      style={{ background: '#0A0A12', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Emotion badge */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
        style={{ background: `${emotionColor}12`, border: `1px solid ${emotionColor}25`, color: emotionColor }}
      >
        <span>{emoji}</span>
        <span>{currentEmotion.emotion}</span>
        <span className="opacity-60">·</span>
        <span>{currentEmotion.confidence}%</span>
      </div>

      {/* Intensity */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
        style={{ background: `${intensityColor}10`, border: `1px solid ${intensityColor}20`, color: intensityColor }}
      >
        <div className="w-3 h-3 flex items-center justify-center">
          <i className="ri-bar-chart-fill text-xs"></i>
        </div>
        {currentEmotion.intensityLabel} Intensity
      </div>

      {/* Modalities */}
      {currentEmotion.modalities.map((m) => {
        const color = modalityColorMap[m.modality] || '#6C63FF';
        const icon = modalityIconMap[m.modality] || 'ri-question-line';
        return (
          <div
            key={m.modality}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
            style={{ background: `${color}10`, border: `1px solid ${color}20`, color }}
          >
            <div className="w-3 h-3 flex items-center justify-center">
              <i className={`${icon} text-xs`}></i>
            </div>
            {m.modality.charAt(0).toUpperCase() + m.modality.slice(1)} {m.confidence}%
          </div>
        );
      })}

      <div className="ml-auto flex-shrink-0">
        <span className="text-gray-600 text-xs">Live emotion context</span>
      </div>
    </div>
  );
}
