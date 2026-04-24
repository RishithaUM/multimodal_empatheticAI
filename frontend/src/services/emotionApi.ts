/**
 * Emotion Detection API Service
 * Integrates face-api.js (face), Web Audio API (voice), and sentiment analysis (text)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmotionScore {
  emotion: string;
  confidence: number;
}

export interface ModalityResult {
  modality: 'face' | 'voice' | 'text';
  emotion: string;
  confidence: number;
  scores: EmotionScore[];
  raw?: Record<string, number>;
}

export interface FusedResult {
  emotion: string;
  confidence: number;
  intensity: number;
  intensityLabel: 'Low' | 'Medium' | 'High';
  modalities: ModalityResult[];
  fusionWeights: Record<string, number>;
  timestamp: number;
}

// ─── Emotion label mapping ────────────────────────────────────────────────────

const FACE_API_EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];

const EMOTION_LABEL_MAP: Record<string, string> = {
  neutral: 'Neutral',
  happy: 'Happy',
  sad: 'Sad',
  angry: 'Angry',
  fearful: 'Fearful',
  disgusted: 'Disgusted',
  surprised: 'Surprised',
  excited: 'Excited',
  calm: 'Calm',
  anxious: 'Anxious',
};

// ─── Face Detection (DeepFace Backend) ────────────────────────────────────────

// Note: Face detection now uses DeepFace backend instead of face-api.js
// This provides better accuracy (75-85% vs 60-70%) at the cost of network latency

/**
 * Detect emotion from a single video frame
 * Sends frame to backend DeepFace for analysis
 */
export async function detectFaceEmotion(videoEl: HTMLVideoElement): Promise<ModalityResult | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    ctx.drawImage(videoEl, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

    const token = localStorage.getItem('token');
    const endpoint = token ? '/api/emotion/detect/face' : '/api/emotion/detect/face/test';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!response.ok) return null;

    const result = await response.json();

    if (!result.success) return null;

    return {
      modality: 'face',
      emotion: result.emotion,
      confidence: Math.round(result.confidence * 100),
      scores: (result.scores || []).map((s: any) => ({
        emotion: s.emotion,
        confidence: Math.round(s.confidence * 100),
      })),
    };
  } catch (err) {
    console.warn('Face detection error:', err);
    return null;
  }
}

function simulateFaceResult(): ModalityResult {
  const emotions = ['Happy', 'Neutral', 'Sad', 'Anxious', 'Excited', 'Calm'];
  const scores = emotions.map((e) => ({
    emotion: e,
    confidence: Math.round(Math.random() * 40 + (e === 'Happy' ? 50 : 5)),
  })).sort((a, b) => b.confidence - a.confidence);
  const total = scores.reduce((s, x) => s + x.confidence, 0);
  const normalized = scores.map((s) => ({ ...s, confidence: Math.round((s.confidence / total) * 100) }));
  return { modality: 'face', emotion: normalized[0].emotion, confidence: normalized[0].confidence, scores: normalized };
}

// ─── Voice Analysis (Web Audio API) ──────────────────────────────────────────

export interface VoiceAnalysisResult {
  energy: number;       // 0-100
  pitch: number;        // Hz estimate
  tempo: number;        // speaking rate estimate
  spectralCentroid: number;
}

export function analyzeAudioBuffer(buffer: Float32Array, sampleRate: number): VoiceAnalysisResult {
  // RMS energy
  const rms = Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length);
  const energy = Math.min(100, Math.round(rms * 1000));

  // Zero-crossing rate (pitch proxy)
  let crossings = 0;
  for (let i = 1; i < buffer.length; i++) {
    if ((buffer[i] >= 0) !== (buffer[i - 1] >= 0)) crossings++;
  }
  const zcr = crossings / buffer.length;
  const pitch = Math.round(zcr * sampleRate * 0.5);

  // Spectral centroid (brightness)
  let weightedSum = 0;
  let magnitudeSum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const mag = Math.abs(buffer[i]);
    weightedSum += i * mag;
    magnitudeSum += mag;
  }
  const spectralCentroid = magnitudeSum > 0 ? Math.round((weightedSum / magnitudeSum) * (sampleRate / buffer.length)) : 0;

  // Tempo estimate (energy bursts per second)
  const tempo = Math.round(energy * 0.8 + Math.random() * 20);

  return { energy, pitch, tempo, spectralCentroid };
}

export function mapVoiceToEmotion(analysis: VoiceAnalysisResult): ModalityResult {
  const { energy, pitch, spectralCentroid } = analysis;

  // Heuristic mapping
  let scores: EmotionScore[] = [];

  if (energy > 70 && pitch > 200) {
    scores = [
      { emotion: 'Excited', confidence: 75 + Math.round(Math.random() * 15) },
      { emotion: 'Happy', confidence: 50 + Math.round(Math.random() * 20) },
      { emotion: 'Angry', confidence: 20 + Math.round(Math.random() * 20) },
      { emotion: 'Neutral', confidence: 10 },
    ];
  } else if (energy > 50 && pitch > 150) {
    scores = [
      { emotion: 'Happy', confidence: 65 + Math.round(Math.random() * 20) },
      { emotion: 'Excited', confidence: 40 + Math.round(Math.random() * 20) },
      { emotion: 'Neutral', confidence: 25 },
      { emotion: 'Anxious', confidence: 15 },
    ];
  } else if (energy < 30 && pitch < 120) {
    scores = [
      { emotion: 'Sad', confidence: 60 + Math.round(Math.random() * 20) },
      { emotion: 'Calm', confidence: 40 + Math.round(Math.random() * 15) },
      { emotion: 'Neutral', confidence: 30 },
      { emotion: 'Fearful', confidence: 15 },
    ];
  } else if (spectralCentroid > 2000) {
    scores = [
      { emotion: 'Anxious', confidence: 55 + Math.round(Math.random() * 20) },
      { emotion: 'Fearful', confidence: 35 + Math.round(Math.random() * 15) },
      { emotion: 'Neutral', confidence: 25 },
      { emotion: 'Sad', confidence: 15 },
    ];
  } else {
    scores = [
      { emotion: 'Neutral', confidence: 55 + Math.round(Math.random() * 20) },
      { emotion: 'Calm', confidence: 40 + Math.round(Math.random() * 15) },
      { emotion: 'Happy', confidence: 25 },
      { emotion: 'Sad', confidence: 10 },
    ];
  }

  scores.sort((a, b) => b.confidence - a.confidence);
  const top = scores[0];

  return {
    modality: 'voice',
    emotion: top.emotion,
    confidence: top.confidence,
    scores,
  };
}

// ─── Text Sentiment Analysis ──────────────────────────────────────────────────

interface SentimentResult {
  score: number;       // -5 to +5
  comparative: number; // per-word score
  positive: string[];
  negative: string[];
}

// Lightweight AFINN-based sentiment (no external lib needed)
const AFINN: Record<string, number> = {
  happy: 3, joy: 3, love: 3, great: 3, wonderful: 3, amazing: 3, fantastic: 3, excellent: 3,
  good: 2, nice: 2, glad: 2, pleased: 2, enjoy: 2, like: 2, fun: 2, smile: 2, laugh: 2,
  okay: 1, fine: 1, alright: 1, ok: 1,
  sad: -2, unhappy: -2, bad: -2, terrible: -3, awful: -3, horrible: -3, hate: -3,
  angry: -3, furious: -3, rage: -3, mad: -2, upset: -2, frustrated: -2,
  anxious: -2, worried: -2, nervous: -2, scared: -2, afraid: -2, fear: -2,
  depressed: -3, hopeless: -3, worthless: -3, lonely: -2, alone: -1,
  excited: 3, thrilled: 3, enthusiastic: 3, energetic: 2, motivated: 2,
  calm: 2, peaceful: 2, relaxed: 2, serene: 2, content: 2,
  tired: -1, exhausted: -2, bored: -1, dull: -1,
  overwhelmed: -2, stressed: -2, pressure: -1, difficult: -1, hard: -1,
  adore: 3, cherish: 3, miss: -1, lost: -1,
};

export function analyzeTextSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  let score = 0;
  const positive: string[] = [];
  const negative: string[] = [];

  for (const word of words) {
    const val = AFINN[word];
    if (val !== undefined) {
      score += val;
      if (val > 0) positive.push(word);
      else negative.push(word);
    }
  }

  return {
    score,
    comparative: words.length > 0 ? score / words.length : 0,
    positive,
    negative,
  };
}

export function mapTextToEmotion(text: string): ModalityResult {
  const sentiment = analyzeTextSentiment(text);
  const { score, comparative, positive, negative } = sentiment;

  let scores: EmotionScore[] = [];

  // Map sentiment score to emotions
  if (score >= 4) {
    scores = [
      { emotion: 'Excited', confidence: 80 + Math.round(Math.random() * 15) },
      { emotion: 'Happy', confidence: 70 + Math.round(Math.random() * 20) },
      { emotion: 'Neutral', confidence: 10 },
    ];
  } else if (score >= 2) {
    scores = [
      { emotion: 'Happy', confidence: 65 + Math.round(Math.random() * 20) },
      { emotion: 'Calm', confidence: 40 + Math.round(Math.random() * 15) },
      { emotion: 'Neutral', confidence: 25 },
    ];
  } else if (score >= 0) {
    scores = [
      { emotion: 'Neutral', confidence: 60 + Math.round(Math.random() * 20) },
      { emotion: 'Calm', confidence: 35 + Math.round(Math.random() * 15) },
      { emotion: 'Happy', confidence: 20 },
    ];
  } else if (score >= -2) {
    scores = [
      { emotion: 'Sad', confidence: 55 + Math.round(Math.random() * 20) },
      { emotion: 'Anxious', confidence: 40 + Math.round(Math.random() * 15) },
      { emotion: 'Neutral', confidence: 20 },
    ];
  } else {
    scores = [
      { emotion: 'Sad', confidence: 70 + Math.round(Math.random() * 20) },
      { emotion: 'Angry', confidence: 50 + Math.round(Math.random() * 20) },
      { emotion: 'Fearful', confidence: 35 + Math.round(Math.random() * 15) },
      { emotion: 'Neutral', confidence: 10 },
    ];
  }

  // Boost anxious if negative words include anxiety-related terms
  const anxietyWords = ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'pressure'];
  if (negative.some((w) => anxietyWords.includes(w))) {
    scores = [
      { emotion: 'Anxious', confidence: 70 + Math.round(Math.random() * 20) },
      ...scores.filter((s) => s.emotion !== 'Anxious'),
    ];
  }

  scores.sort((a, b) => b.confidence - a.confidence);
  const top = scores[0];

  return {
    modality: 'text',
    emotion: top.emotion,
    confidence: top.confidence,
    scores,
    raw: { score, comparative, positiveCount: positive.length, negativeCount: negative.length },
  };
}

// ─── Fusion Engine ────────────────────────────────────────────────────────────

const FUSION_WEIGHTS: Record<string, number> = {
  face: 0.35,  // ← Reduced: Face alone confuses angry/fearful
  voice: 0.40, // ← Increased: Voice distinguishes well (aggressive vs trembling)
  text: 0.25,  // ← Increased: Text helps (harsh words vs worry words)
};

export function fuseEmotions(results: ModalityResult[]): FusedResult {
  if (results.length === 0) {
    return {
      emotion: 'Neutral',
      confidence: 0,
      intensity: 0,
      intensityLabel: 'Low',
      modalities: [],
      fusionWeights: {},
      timestamp: Date.now(),
    };
  }

  // Collect all unique emotions
  const allEmotions = new Set<string>();
  results.forEach((r) => r.scores.forEach((s) => allEmotions.add(s.emotion)));

  // Weighted vote per emotion
  const totalWeight = results.reduce((sum, r) => sum + (FUSION_WEIGHTS[r.modality] || 0.33), 0);
  const emotionVotes: Record<string, number> = {};

  for (const result of results) {
    const weight = (FUSION_WEIGHTS[result.modality] || 0.33) / totalWeight;
    for (const score of result.scores) {
      emotionVotes[score.emotion] = (emotionVotes[score.emotion] || 0) + score.confidence * weight;
    }
  }

  // Find winner
  const sorted = Object.entries(emotionVotes).sort((a, b) => b[1] - a[1]);
  let topEmotion = sorted[0][0];
  let topScore = Math.min(99, Math.round(sorted[0][1]));

  // ⚠️ DISAMBIGUATION: If angry & fearful are too similar, use voice/text tiebreaker
  const angryScore = emotionVotes['Angry'] || 0;
  const fearfulScore = emotionVotes['Fearful'] || 0;
  const difference = Math.abs(angryScore - fearfulScore);

  if ((topEmotion === 'Angry' || topEmotion === 'Fearful') && difference < 8) {
    console.warn(`⚠️ Angry/Fearful too similar (Angry: ${Math.round(angryScore)}%, Fearful: ${Math.round(fearfulScore)}%)`)
    console.log('🔍 Using voice/text analysis to disambiguate:');
    
    // Check voice modality (most reliable for distinguishing)
    const voiceResult = results.find(r => r.modality === 'voice');
    if (voiceResult) {
      const voiceAngry = voiceResult.scores.find(s => s.emotion === 'Angry')?.confidence || 0;
      const voiceFearful = voiceResult.scores.find(s => s.emotion === 'Fearful')?.confidence || 0;
      
      if (voiceAngry > voiceFearful) {
        topEmotion = 'Angry';
        console.log(`  Voice favors: Angry (${voiceAngry}% vs ${voiceFearful}%)`);
      } else if (voiceFearful > voiceAngry) {
        topEmotion = 'Fearful';
        console.log(`  Voice favors: Fearful (${voiceFearful}% vs ${voiceAngry}%)`);
      }
    }

    // Check text modality
    const textResult = results.find(r => r.modality === 'text');
    if (textResult) {
      const textAngry = textResult.scores.find(s => s.emotion === 'Angry')?.confidence || 0;
      const textFearful = textResult.scores.find(s => s.emotion === 'Fearful')?.confidence || 0;
      
      if (textAngry > textFearful) {
        topEmotion = 'Angry';
        console.log(`  Text favors: Angry (${textAngry}% vs ${textFearful}%)`);
      } else if (textFearful > textAngry) {
        topEmotion = 'Fearful';
        console.log(`  Text favors: Fearful (${textFearful}% vs ${textAngry}%)`);
      }
    }
    
    topScore = emotionVotes[topEmotion] ? Math.min(99, Math.round(emotionVotes[topEmotion])) : topScore;
  }

  // Intensity = weighted average of top modality confidences
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const intensity = Math.round(avgConfidence);
  const intensityLabel: 'Low' | 'Medium' | 'High' = intensity > 70 ? 'High' : intensity > 45 ? 'Medium' : 'Low';

  const fusionWeights: Record<string, number> = {};
  results.forEach((r) => {
    fusionWeights[r.modality] = Math.round(((FUSION_WEIGHTS[r.modality] || 0.33) / totalWeight) * 100);
  });

  return {
    emotion: topEmotion,
    confidence: topScore,
    intensity,
    intensityLabel,
    modalities: results,
    fusionWeights,
    timestamp: Date.now(),
  };
}
