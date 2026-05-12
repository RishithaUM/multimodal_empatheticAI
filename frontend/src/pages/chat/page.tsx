import { useState, useRef, useEffect, useCallback } from 'react';
import { useEmotionWebSocket } from '@/hooks/useEmotionWebSocket';
import type { FusedResult } from '@/services/emotionApi';
import ChatHeader from './components/ChatHeader';
import EmotionContextBar from './components/EmotionContextBar';
import MessageBubble from './components/MessageBubble';
import type { ChatMessage } from './components/MessageBubble';
import QuickReplies from './components/QuickReplies';
import ChatInput from './components/ChatInput';

const HISTORY_API = 'http://localhost:5000/api/emotion/history?limit=1';

/** Map a backend DB record → FusedResult shape */
function recordToFused(rec: Record<string, unknown>): FusedResult {
  const modDict = (rec.modalities ?? {}) as Record<string, { emotion: string; confidence: number; scores?: { emotion: string; confidence: number }[] }>;
  const modalities = Object.entries(modDict).map(([key, val]) => ({
    modality: key as 'face' | 'voice' | 'text',
    emotion: val.emotion ?? '',
    confidence: Math.round((val.confidence ?? 0) * (val.confidence <= 1 ? 100 : 1)),
    scores: val.scores ?? [{ emotion: val.emotion, confidence: Math.round((val.confidence ?? 0) * (val.confidence <= 1 ? 100 : 1)) }],
  }));
  const conf = rec.confidence as number;
  return {
    emotion: rec.emotion as string,
    confidence: Math.round(conf > 1 ? conf : conf * 100),
    intensity: rec.intensity as number ?? 50,
    intensityLabel: (rec.intensity_label as 'Low' | 'Medium' | 'High') ?? 'Medium',
    modalities,
    fusionWeights: (rec.fusion_weights as Record<string, number>) ?? {},
    timestamp: rec.created_at ? new Date(rec.created_at as string).getTime() : Date.now(),
  };
}

/** Load the most recent real analysis — tries backend API first, falls back to localStorage */
async function fetchLastAnalysis(): Promise<FusedResult | null> {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch(HISTORY_API, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json() as { history?: Record<string, unknown>[] };
        const rec = data.history?.[0];
        if (rec) return recordToFused(rec);
      }
    } catch { /* fall through */ }
  }
  // localStorage fallback (unauthenticated saves)
  try {
    const raw = localStorage.getItem('empathAI_history');
    if (raw) {
      const arr = JSON.parse(raw) as FusedResult[];
      if (arr[0]) return arr[0];
    }
  } catch { /* ignore */ }
  return null;
}

const CHAT_API = 'http://localhost:5000/api/chat/ollama-message';

async function fetchOllamaReply(
  message: string,
  emotion: string | null,
  history: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch(CHAT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, emotion: emotion || 'neutral', history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  const data = await res.json() as { reply?: string };
  return data.reply || "I'm here for you. What would you like to talk about?";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(() => localStorage.getItem('empathai_auto_speak') !== 'false');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => localStorage.getItem('empathai_tts_voice') || '');
  const [lastAnalysis, setLastAnalysis] = useState<FusedResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenMessageId = useRef<string | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Keep a rolling history for Ollama context (role/content pairs)
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const { currentEmotion, wsStatus, connect, disconnect } = useEmotionWebSocket();

  // Fetch the most recent real analysis on mount
  useEffect(() => {
    fetchLastAnalysis().then((r) => { if (r) setLastAnalysis(r); });
  }, []);

  // Use real WS data only when actually connected; fall back to last saved analysis
  const isLive = wsStatus === 'connected';
  const displayEmotion: FusedResult | null = isLive ? currentEmotion : (lastAnalysis ?? null);

  useEffect(() => {
    const savedUrl = localStorage.getItem('empathai_ws_url') || undefined;
    connect(savedUrl);
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      if (voices.length === 0) return;

      const preferred = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
      const list = preferred.length > 0 ? preferred : voices;
      setAvailableVoices(list);

      if (!selectedVoiceURI || !list.some((voice) => voice.voiceURI === selectedVoiceURI)) {
        setSelectedVoiceURI(list[0].voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
    };
  }, [selectedVoiceURI]);

  useEffect(() => {
    localStorage.setItem('empathai_auto_speak', autoSpeakEnabled ? 'true' : 'false');
  }, [autoSpeakEnabled]);

  useEffect(() => {
    if (selectedVoiceURI) {
      localStorage.setItem('empathai_tts_voice', selectedVoiceURI);
    }
  }, [selectedVoiceURI]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== 'ai' || latestMessage.id === 'welcome') return;
    if (lastSpokenMessageId.current === latestMessage.id) return;
    if (!window.speechSynthesis) return;
    if (!autoSpeakEnabled) return;

    const utterance = new SpeechSynthesisUtterance(latestMessage.text.replace(/^⚠️\s*/, ''));
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = 'en-US';

    const selectedVoice = availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    };

    window.speechSynthesis.cancel();
    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    lastSpokenMessageId.current = latestMessage.id;

    return () => {
      utterance.onend = null;
      utterance.onerror = null;
      utterance.onstart = null;
    };
  }, [messages, autoSpeakEnabled, availableVoices, selectedVoiceURI]);

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Append to rolling history
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];

    try {
      const emotion = displayEmotion?.emotion || null;
      const reply = await fetchOllamaReply(text, emotion, historyRef.current.slice(-20));

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion: emotion || undefined,
        confidence: displayEmotion?.confidence,
      };
      setMessages((prev) => [...prev, aiMsg]);
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Could not reach Ollama.';
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'ai',
        text: `⚠️ ${errText}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [currentEmotion]);

  const handleClearChat = useCallback(() => {
    historyRef.current = [];
    lastSpokenMessageId.current = null;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
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

  const handleStopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  return (
    <div className="h-screen flex flex-col" style={{ background: '#07070E' }}>
      {/* Header */}
      <ChatHeader
        currentEmotion={displayEmotion}
        wsStatus={wsStatus}
        messageCount={messages.length}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />

      {/* Emotion context bar */}
      <EmotionContextBar currentEmotion={displayEmotion} isLive={isLive} />

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
            emotion={displayEmotion?.emotion || null}
            onSelect={handleQuickReply}
          />

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            isTyping={isTyping}
            autoSpeakEnabled={autoSpeakEnabled}
            onToggleAutoSpeak={() => setAutoSpeakEnabled((prev) => !prev)}
            voices={availableVoices}
            selectedVoiceURI={selectedVoiceURI}
            onSelectVoice={setSelectedVoiceURI}
            isSpeaking={isSpeaking}
            onStopSpeaking={handleStopSpeaking}
          />
        </div>
      </div>
    </div>
  );
}
