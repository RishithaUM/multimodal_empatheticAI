import { useState, useRef, useEffect, useCallback } from 'react';
import { chatMessages as initialMessages } from '@/mocks/emotions';
import { useEmotionWebSocket } from '@/hooks/useEmotionWebSocket';
import ChatHeader from './components/ChatHeader';
import EmotionContextBar from './components/EmotionContextBar';
import MessageBubble from './components/MessageBubble';
import type { ChatMessage } from './components/MessageBubble';
import QuickReplies from './components/QuickReplies';
import ChatInput from './components/ChatInput';
import EmotionSidebar from './components/EmotionSidebar';

// ─── AI Response Engine ───────────────────────────────────────────────────────

const aiResponsesByEmotion: Record<string, string[]> = {
  Anxious: [
    "I can sense you might be feeling anxious right now. That's completely valid. Would you like to try a quick breathing exercise together?",
    "Anxiety can feel overwhelming, but you're not alone. Let's break down what's on your mind into smaller, manageable pieces.",
    "Based on your current emotional state, I'd suggest the 4-7-8 breathing technique. Inhale for 4 seconds, hold for 7, exhale for 8. Want to try it?",
    "I notice elevated anxiety in your readings. Sometimes just naming the feeling helps — what's the main thing weighing on you right now?",
  ],
  Sad: [
    "I hear you, and I want you to know that what you're feeling is completely valid. Sadness is a natural part of being human.",
    "It sounds like you're going through a tough time. I'm here to listen — would you like to talk about what's been happening?",
    "Sometimes sadness needs to be felt before it can pass. Is there something specific that's been bringing you down lately?",
    "Your emotional readings show some sadness. Remember, reaching out — even to an AI — is a sign of strength. What's on your heart?",
  ],
  Happy: [
    "Your positive energy is coming through clearly! What's been making you feel so good today?",
    "I love seeing you in such a great mood! This is a perfect time to tackle something you've been putting off.",
    "That happiness is contagious! What's the highlight of your day so far?",
    "You're radiating positive vibes right now. Want to channel this energy into something meaningful?",
  ],
  Excited: [
    "Your excitement is palpable! What's got you so energized right now?",
    "That's a lot of great energy! Let's make sure we direct it somewhere productive. What are you most excited about?",
    "I can feel your enthusiasm! Just remember to pause and think before making any big decisions in this state.",
    "Wow, you're really fired up! Tell me what's going on — I want to hear all about it.",
  ],
  Angry: [
    "I can sense some frustration in your current state. It's okay to feel angry — what's been triggering this for you?",
    "Anger often signals that something important to us has been violated. What's the core issue here?",
    "Before we dive in, let's take a breath together. What happened that's got you feeling this way?",
    "Your feelings are valid. Sometimes anger is just hurt wearing a different mask. What's really going on?",
  ],
  Calm: [
    "You're in a beautifully calm state right now. This is ideal for deep reflection or focused work. What's on your mind?",
    "That peaceful energy you're carrying is wonderful. What would you like to explore or accomplish in this mindset?",
    "Calm is such a powerful state. You have great clarity right now — is there something you've been wanting to think through?",
  ],
  Fearful: [
    "I notice some fear in your readings. Fear is your mind trying to protect you — let's look at what it's responding to.",
    "It's okay to be scared. Can you tell me more about what's making you feel fearful right now?",
    "Fear often shrinks when we shine a light on it. What specifically is worrying you?",
  ],
  Neutral: [
    "I hear you. That sounds really challenging. Can you tell me more about what's been on your mind?",
    "Based on your current emotional state, I'd suggest taking a few deep breaths. Would you like to try a quick mindfulness exercise?",
    "It's completely normal to feel that way. Your emotions are valid. What would help you most right now?",
    "I've noticed a pattern in your recent sessions — you tend to feel more anxious in the afternoons. Does that resonate with you?",
    "That's a really insightful observation. Emotional awareness is the first step toward positive change.",
  ],
};

const defaultResponses = [
  "I hear you. That sounds really challenging. Can you tell me more about what's been on your mind?",
  "Based on your current emotional state, I'd suggest taking a few deep breaths. Would you like to try a quick mindfulness exercise?",
  "It's completely normal to feel that way. Your emotions are valid. What would help you most right now?",
  "That's a really insightful observation. Emotional awareness is the first step toward positive change.",
];

function getAIResponse(emotion: string | null): string {
  const pool = emotion && aiResponsesByEmotion[emotion]
    ? aiResponsesByEmotion[emotion]
    : defaultResponses;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.map((m) => ({ ...m, role: m.role as 'ai' | 'user' }))
  );
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sessionStart] = useState(new Date());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentEmotion, wsStatus, connect, disconnect } = useEmotionWebSocket();

  useEffect(() => {
    const savedUrl = localStorage.getItem('empathai_ws_url') || undefined;
    connect(savedUrl);
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const delay = 1000 + Math.random() * 1000;
    await new Promise((r) => setTimeout(r, delay));

    const emotion = currentEmotion?.emotion || null;
    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: getAIResponse(emotion),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      emotion: emotion || undefined,
      confidence: currentEmotion?.confidence,
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  }, [currentEmotion]);

  const handleClearChat = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'ai',
      text: "Chat cleared. I'm here whenever you're ready to talk. How are you feeling right now?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, []);

  const handleExportChat = useCallback(() => {
    const lines = messages.map((m) =>
      `[${m.time}] ${m.role === 'ai' ? 'EmpathAI' : 'You'}: ${m.text}`
    );
    const content = `EmpathAI Chat Export\nDate: ${new Date().toLocaleString()}\n\n${lines.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EmpathAI-Chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const handleQuickReply = useCallback((text: string) => {
    handleSend(text);
  }, [handleSend]);

  return (
    <div className="h-screen flex flex-col" style={{ background: '#07070E' }}>
      {/* Header */}
      <ChatHeader
        currentEmotion={currentEmotion}
        wsStatus={wsStatus}
        messageCount={messages.length}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />

      {/* Emotion context bar */}
      <EmotionContextBar currentEmotion={currentEmotion} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                >
                  <div className="w-8 h-8 flex items-center justify-center">
                    <i className="ri-robot-line text-white text-2xl"></i>
                  </div>
                </div>
                <p className="text-white text-lg font-semibold mb-2">Start a conversation</p>
                <p className="text-gray-500 text-sm max-w-xs">
                  EmpathAI is here to support you. Share how you're feeling or ask anything.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className="ri-robot-line text-white text-xs"></i>
                  </div>
                </div>
                <div
                  className="px-4 py-3"
                  style={{ background: '#1C1C28', borderRadius: '18px 18px 18px 4px', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: '#6C63FF', animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          <QuickReplies
            emotion={currentEmotion?.emotion || null}
            onSelect={handleQuickReply}
          />

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            isTyping={isTyping}
          />
        </div>

        {/* Sidebar toggle button (mobile) */}
        <button
          onClick={() => setShowSidebar((v) => !v)}
          className="hidden lg:flex absolute right-72 top-1/2 -translate-y-1/2 w-5 h-10 items-center justify-center cursor-pointer z-10"
          style={{ background: '#1C1C28', borderRadius: '6px 0 0 6px', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="w-3 h-3 flex items-center justify-center">
            <i className={showSidebar ? 'ri-arrow-right-s-line text-gray-500 text-xs' : 'ri-arrow-left-s-line text-gray-500 text-xs'}></i>
          </div>
        </button>

        {/* Emotion sidebar */}
        {showSidebar && (
          <EmotionSidebar
            currentEmotion={currentEmotion}
            messageCount={messages.length}
            sessionStart={sessionStart}
          />
        )}
      </div>
    </div>
  );
}
