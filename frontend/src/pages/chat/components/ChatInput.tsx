import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  isTyping: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, isTyping, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

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

      <p className="text-gray-600 text-xs mt-2 text-center">
        EmpathAI responds with awareness of your current emotional state · Shift+Enter for new line
      </p>
    </div>
  );
}
