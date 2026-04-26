const emotionColors: Record<string, string> = {
  Happy: '#00D4AA', Sad: '#6C63FF', Anxious: '#F59E0B', Angry: '#EF4444',
  Neutral: '#94A3B8', Excited: '#EC4899', Calm: '#3B82F6', Fearful: '#8B5CF6',
  Disgusted: '#10B981', Surprised: '#F97316',
};

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  time: string;
  emotion?: string;
  confidence?: number;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

const emotionEmoji: Record<string, string> = {
  Happy: '😊', Excited: '🤩', Calm: '😌', Sad: '😢',
  Anxious: '😰', Angry: '😠', Neutral: '😐', Fearful: '😨',
  Disgusted: '🤢', Surprised: '😲',
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const emotionColor = message.emotion ? (emotionColors[message.emotion] || '#6C63FF') : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 group`}>
      {/* AI avatar */}
      {!isUser && (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-robot-line text-white text-xs"></i>
          </div>
        </div>
      )}

      <div className={`max-w-[72%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Emotion context tag for AI messages */}
        {!isUser && message.emotion && emotionColor && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium self-start"
            style={{ background: `${emotionColor}12`, border: `1px solid ${emotionColor}20`, color: emotionColor }}
          >
            <span>{emotionEmoji[message.emotion] || '🧠'}</span>
            <span>Responding to: {message.emotion}</span>
            {message.confidence && (
              <span className="opacity-60">· {message.confidence}%</span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className="px-4 py-3 text-sm leading-relaxed text-white"
          style={{
            background: isUser
              ? 'linear-gradient(135deg, #6C63FF, #8B5CF6)'
              : '#1C1C28',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {message.text}
        </div>

        {/* Timestamp */}
        <span className="text-gray-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          {message.time}
        </span>
      </div>

      {/* User avatar */}
      {isUser && (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 text-white text-xs font-bold"
          style={{ background: 'rgba(108,99,255,0.2)', border: '1px solid rgba(108,99,255,0.3)' }}
        >
          A
        </div>
      )}
    </div>
  );
}
