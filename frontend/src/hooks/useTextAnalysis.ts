import { useState, useCallback } from 'react';
import { mapTextToEmotion, analyzeTextSentiment } from '@/services/emotionApi';
import type { ModalityResult, SentimentResult } from '@/services/emotionApi';

// Re-export SentimentResult type for consumers
export type { SentimentResult };

export interface UseTextAnalysisReturn {
  text: string;
  setText: (t: string) => void;
  sentiment: ReturnType<typeof analyzeTextSentiment> | null;
  lastResult: ModalityResult | null;
  analyzeText: () => ModalityResult | null;
  resetText: () => void;
  charCount: number;
  wordCount: number;
}

export function useTextAnalysis(): UseTextAnalysisReturn {
  const [text, setText] = useState('');
  const [sentiment, setSentiment] = useState<ReturnType<typeof analyzeTextSentiment> | null>(null);
  const [lastResult, setLastResult] = useState<ModalityResult | null>(null);

  const analyzeText = useCallback((): ModalityResult | null => {
    if (!text.trim()) return null;
    const s = analyzeTextSentiment(text);
    setSentiment(s);
    const result = mapTextToEmotion(text);
    setLastResult(result);
    return result;
  }, [text]);

  const resetText = useCallback(() => {
    setText('');
    setSentiment(null);
    setLastResult(null);
  }, []);

  const words = text.trim().split(/\s+/).filter(Boolean);

  return {
    text,
    setText,
    sentiment,
    lastResult,
    analyzeText,
    resetText,
    charCount: text.length,
    wordCount: words.length,
  };
}
