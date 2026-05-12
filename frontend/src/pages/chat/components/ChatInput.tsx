import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  isTyping: boolean;
  disabled?: boolean;
  autoSpeakEnabled: boolean;
  onToggleAutoSpeak: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  onSelectVoice: (voiceURI: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

export default function ChatInput({
  onSend,
  isTyping,
  disabled,
  autoSpeakEnabled,
  onToggleAutoSpeak,
  voices,
  selectedVoiceURI,
  onSelectVoice,
  isSpeaking,
  onStopSpeaking,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  type SpeechRecognition = typeof window extends { SpeechRecognition: infer T }
    ? T
    : typeof window extends { webkitSpeechRecognition: infer T }
    ? T
    : never;

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const startListening = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || '')
          .join('')
          .trim();

        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setSpeechSupported(true);
      setIsListening(true);
      recognition.start();
    } catch {
      setSpeechSupported(false);
      setIsListening(false);
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !isTyping && !disabled;

  return (
    <div
      className="px-6 py-4 flex-shrink-0"
      style={{ background: '#0D0D14', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="flex items-end gap-3 rounded-2xl p-3 transition-all"
        style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-gray-600 outline-none resize-none text-sm leading-relaxed"
          style={{ maxHeight: '120px', fontSize: '13px' }}
        />

        <button
          onClick={handleVoiceToggle}
          disabled={isTyping || disabled || !speechSupported}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer whitespace-nowrap transition-all flex-shrink-0 self-end"
          title={speechSupported ? (isListening ? 'Stop voice input' : 'Start voice input') : 'Voice input not supported in this browser'}
          style={{
            background: isListening ? 'rgba(0,212,170,0.18)' : 'rgba(255,255,255,0.05)',
            border: isListening ? '1px solid rgba(0,212,170,0.35)' : '1px solid rgba(255,255,255,0.08)',
            opacity: isTyping || disabled || !speechSupported ? 0.45 : 1,
          }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i
              className={`text-sm ${isListening ? 'ri-mic-fill' : 'ri-mic-line'}`}
              style={{ color: isListening ? '#00D4AA' : '#FFFFFF' }}
            ></i>
          </div>
        </button>

        {/* Character count */}
        {input.length > 200 && (
          <span className="text-xs text-gray-600 flex-shrink-0 self-end mb-0.5">
            {input.length}/500
          </span>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer whitespace-nowrap transition-all flex-shrink-0 self-end"
          style={{
            background: canSend ? 'linear-gradient(135deg, #6C63FF, #8B5CF6)' : 'rgba(255,255,255,0.05)',
            opacity: canSend ? 1 : 0.4,
          }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            {isTyping ? (
              <i className="ri-loader-4-line text-white text-sm animate-spin"></i>
            ) : (
              <i className="ri-send-plane-fill text-white text-sm"></i>
            )}
          </div>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleAutoSpeak}
            className="h-8 px-3 rounded-lg text-xs flex items-center gap-1.5 transition-all"
            style={{
              background: autoSpeakEnabled ? 'rgba(0,212,170,0.14)' : 'rgba(255,255,255,0.05)',
              border: autoSpeakEnabled ? '1px solid rgba(0,212,170,0.35)' : '1px solid rgba(255,255,255,0.08)',
              color: autoSpeakEnabled ? '#00D4AA' : '#9CA3AF',
            }}
          >
            <i className={`text-sm ${autoSpeakEnabled ? 'ri-volume-up-line' : 'ri-volume-mute-line'}`}></i>
            {autoSpeakEnabled ? 'Auto voice on' : 'Auto voice off'}
          </button>

          <div
            className="h-8 px-2 rounded-lg flex items-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <i className="ri-user-voice-line text-xs mr-2" style={{ color: '#9CA3AF' }}></i>
            <select
              value={selectedVoiceURI}
              onChange={(e) => onSelectVoice(e.target.value)}
              className="bg-transparent text-xs text-gray-300 outline-none"
            >
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI} className="text-black">
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isSpeaking && (
          <div
            className="h-8 px-3 rounded-lg text-xs flex items-center gap-2"
            style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.3)', color: '#A78BFA' }}
          >
            <i className="ri-volume-up-line"></i>
            Speaking...
            <button
              onClick={onStopSpeaking}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              title="Stop speaking"
            >
              <i className="ri-stop-fill text-[10px]" style={{ color: '#E9D5FF' }}></i>
            </button>
          </div>
        )}
      </div>

      <p className="text-gray-600 text-xs mt-2 text-center">
        EmpathAI responds with awareness of your current emotional state · Shift+Enter for new line
      </p>
    </div>
  );
}
