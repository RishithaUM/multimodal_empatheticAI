interface QuickRepliesProps {
  emotion: string | null;
  onSelect: (text: string) => void;
}

const quickRepliesByEmotion: Record<string, string[]> = {
  Anxious: [
    "I'm feeling overwhelmed right now",
    "Can you help me calm down?",
    "What breathing exercises do you recommend?",
    "I need to talk through my worries",
  ],
  Sad: [
    "I'm feeling really down today",
    "Can you help me feel better?",
    "I need some encouragement",
    "Tell me something positive",
  ],
  Happy: [
    "I'm in a great mood today!",
    "I want to share some good news",
    "What should I do with this energy?",
    "Help me stay productive",
  ],
  Excited: [
    "I have so much energy right now!",
    "I want to channel this excitement",
    "Help me focus this enthusiasm",
    "I just achieved something great!",
  ],
  Angry: [
    "I need to vent about something",
    "Help me calm down",
    "I'm really frustrated right now",
    "How do I manage this anger?",
  ],
  Calm: [
    "I'm feeling peaceful today",
    "What's a good activity for this state?",
    "Help me stay in this mindset",
    "I want to reflect on my day",
  ],
  Fearful: [
    "I'm scared about something",
    "Help me face my fears",
    "I need reassurance",
    "How do I ground myself?",
  ],
  Neutral: [
    "How are you today?",
    "Tell me about my recent emotions",
    "What should I focus on?",
    "Give me a mindfulness tip",
  ],
};

const defaultReplies = [
  "How are you today?",
  "Tell me about my recent emotions",
  "Give me a mindfulness tip",
  "What should I focus on?",
];

export default function QuickReplies({ emotion, onSelect }: QuickRepliesProps) {
  const replies = emotion && quickRepliesByEmotion[emotion]
    ? quickRepliesByEmotion[emotion]
    : defaultReplies;

  return (
    <div className="px-6 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <p className="text-gray-600 text-xs mb-2">Quick replies</p>
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => (
          <button
            key={reply}
            onClick={() => onSelect(reply)}
            className="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-all hover:opacity-80 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9CA3AF',
            }}
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
}
