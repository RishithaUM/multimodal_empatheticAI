import { useNavigate } from 'react-router-dom';
import type { FusedResult } from '@/services/emotionApi';
import { emotionColors } from '@/mocks/emotions';

interface EmotionSidebarProps {
  currentEmotion: FusedResult | null;
  messageCount: number;
  sessionStart: Date;
}

const emotionEmoji: Record<string, string> = {
  Happy: '😊', Excited: '🤩', Calm: '😌', Sad: '😢',
  Anxious: '😰', Angry: '😠', Neutral: '😐', Fearful: '😨',
  Disgusted: '🤢', Surprised: '😲',
};

const moodTips: Record<string, { title: string; tip: string; icon: string }[]> = {
  Anxious: [
    { title: '4-7-8 Breathing', tip: 'Inhale 4s, hold 7s, exhale 8s. Repeat 3 times.', icon: 'ri-lungs-line' },
    { title: 'Ground Yourself', tip: 'Name 5 things you can see, 4 you can touch.', icon: 'ri-focus-3-line' },
  ],
  Sad: [
    { title: 'Gentle Movement', tip: 'A short walk can shift your emotional state.', icon: 'ri-walk-line' },
    { title: 'Connect', tip: 'Reach out to someone you trust today.', icon: 'ri-heart-line' },
  ],
  Happy: [
    { title: 'Capture It', tip: 'Journal this moment to reinforce positivity.', icon: 'ri-book-open-line' },
    { title: 'Share It', tip: 'Your positive energy is contagious — spread it!', icon: 'ri-share-line' },
  ],
  Angry: [
    { title: 'Step Away', tip: 'Take a 10-minute break before responding.', icon: 'ri-time-line' },
    { title: 'Physical Release', tip: 'Exercise helps release built-up tension.', icon: 'ri-run-line' },
  ],
  Calm: [
    { title: 'Deep Work', tip: 'This is your ideal state for focused tasks.', icon: 'ri-focus-2-line' },
    { title: 'Reflect', tip: 'Use this clarity to plan or make decisions.', icon: 'ri-lightbulb-line' },
  ],
  Excited: [
    { title: 'Channel It', tip: 'Direct this energy toward a meaningful goal.', icon: 'ri-rocket-line' },
    { title: 'Ground First', tip: 'Pause before making big decisions.', icon: 'ri-pause-circle-line' },
  ],
  Neutral: [
    { title: 'Check In', tip: 'What would bring more joy to your day?', icon: 'ri-question-line' },
    { title: 'Routine Tasks', tip: 'Great state for getting things done.', icon: 'ri-checkbox-line' },
  ],
};

const defaultTips = [
  { title: 'Run Analysis', tip: 'Detect your emotion to get personalized tips.', icon: 'ri-scan-line' },
  { title: 'Stay Mindful', tip: 'Check in with yourself throughout the day.', icon: 'ri-mental-health-line' },
];

export default function EmotionSidebar({ currentEmotion, messageCount, sessionStart }: EmotionSidebarProps) {
  const navigate = useNavigate();
  const emotionColor = currentEmotion ? (emotionColors[currentEmotion.emotion] || '#6C63FF') : '#6C63FF';
  const emoji = currentEmotion ? (emotionEmoji[currentEmotion.emotion] || '🧠') : '🧠';
  const tips = currentEmotion ? (moodTips[currentEmotion.emotion] || defaultTips) : defaultTips;

  const sessionDuration = Math.floor((Date.now() - sessionStart.getTime()) / 60000);

  return (
    <div
      className="w-72 flex-shrink-0 flex flex-col overflow-y-auto"
      style={{ background: '#0D0D14', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Emotion card */}
      <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Current Emotion</p>

        {currentEmotion ? (
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: '#13131A', border: `1px solid ${emotionColor}20` }}
          >
            {/* Glow */}
            <div
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-15 pointer-events-none"
              style={{ background: emotionColor, filter: 'blur(20px)' }}
            />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{emoji}</span>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full"
                  style={{ background: `${emotionColor}15`, color: emotionColor }}
                >
                  {currentEmotion.confidence}%
                </span>
              </div>

              <p className="text-white text-lg font-black mb-1" style={{ color: emotionColor }}>
                {currentEmotion.emotion}
              </p>
              <p className="text-gray-500 text-xs mb-3">
                {currentEmotion.intensityLabel} intensity · {currentEmotion.modalities.length} modalities
              </p>

              {/* Confidence bar */}
              <div className="w-full h-1.5 rounded-full mb-1" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${currentEmotion.confidence}%`, background: emotionColor }}
                />
              </div>
              <p className="text-gray-600 text-xs">Confidence</p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(108,99,255,0.1)' }}>
              <div className="w-5 h-5 flex items-center justify-center">
                <i className="ri-emotion-line text-gray-500 text-lg"></i>
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-3">No emotion detected</p>
            <button
              onClick={() => navigate('/analyze')}
              className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
              style={{ background: 'rgba(108,99,255,0.15)', color: '#8B5CF6', border: '1px solid rgba(108,99,255,0.25)' }}
            >
              Run Analysis
            </button>
          </div>
        )}
      </div>

      {/* Session stats */}
      <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Session</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Messages', value: messageCount.toString(), icon: 'ri-chat-3-line', color: '#6C63FF' },
            { label: 'Duration', value: `${sessionDuration}m`, icon: 'ri-time-line', color: '#00D4AA' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3"
              style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-6 h-6 flex items-center justify-center mb-2" style={{ color: stat.color }}>
                <i className={`${stat.icon} text-sm`}></i>
              </div>
              <p className="text-white text-lg font-black">{stat.value}</p>
              <p className="text-gray-600 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mood tips */}
      <div className="p-5 flex-1">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">
          {currentEmotion ? `Tips for ${currentEmotion.emotion}` : 'Wellness Tips'}
        </p>
        <div className="space-y-3">
          {tips.map((tip) => (
            <div
              key={tip.title}
              className="rounded-xl p-3"
              style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 flex items-center justify-center" style={{ color: emotionColor }}>
                  <i className={`${tip.icon} text-sm`}></i>
                </div>
                <p className="text-white text-xs font-semibold">{tip.title}</p>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">{tip.tip}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'History', icon: 'ri-history-line', path: '/history' },
            { label: 'Analytics', icon: 'ri-bar-chart-2-line', path: '/analytics' },
            { label: 'Results', icon: 'ri-file-chart-line', path: '/results' },
            { label: 'Analyze', icon: 'ri-scan-line', path: '/analyze' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl cursor-pointer whitespace-nowrap transition-all hover:bg-white/5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${action.icon} text-gray-400 text-sm`}></i>
              </div>
              <span className="text-gray-500 text-xs">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
