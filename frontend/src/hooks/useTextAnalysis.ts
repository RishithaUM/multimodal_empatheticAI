import { useState, useCallback } from 'react';
import { detectTextEmotion } from '@/services/emotionApi';
import type { ModalityResult } from '@/services/emotionApi';

export interface UseTextAnalysisReturn {
  text: string;
  setText: (t: string) => void;
  lastResult: ModalityResult | null;
  analyzeText: () => Promise<ModalityResult | null>;
  resetText: () => void;
  charCount: number;
  wordCount: number;
}

export function useTextAnalysis(): UseTextAnalysisReturn {
  const [text, setText] = useState('');
  const [lastResult, setLastResult] = useState<ModalityResult | null>(null);

  const analyzeText = useCallback(async (): Promise<ModalityResult | null> => {
    if (!text.trim()) return null;
    const result = await detectTextEmotion(text);
    setLastResult(result);
    return result;
  }, [text]);

  const resetText = useCallback(() => {
    setText('');
    setLastResult(null);
  }, []);

  const words = text.trim().split(/\s+/).filter(Boolean);

  return {
    text,
    setText,
    lastResult,
    analyzeText,
    resetText,
    charCount: text.length,
    wordCount: words.length,
  };
}
