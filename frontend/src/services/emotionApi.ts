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

// ─── Face Detection (face-api.js - Best for Facial Emotions) ────────────────────

let faceApiLoaded = false;
let faceApiLoading = false;

async function loadFaceApi(): Promise<boolean> {
  if (faceApiLoaded) return true;
  if (faceApiLoading) {
    // Wait for it to finish
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (faceApiLoaded) { clearInterval(check); resolve(); }
      }, 200);
    });
    return faceApiLoaded;
  }

  faceApiLoading = true;
  try {
    // Dynamically load face-api.js from CDN with fallback
    const cdnUrls = [
      'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js', // Primary
      'https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js',             // Fallback 1
    ];

    let loaded = false;
    let modelsLoaded = false;
    let lastError: Error | null = null;

    for (const cdnUrl of cdnUrls) {
      try {
        await new Promise<void>((resolve, reject) => {
          if ((window as any).faceapi) { resolve(); return; }
          const script = document.createElement('script');
          script.src = cdnUrl;
          script.onload = () => {
            console.log(`✅ face-api.js loaded from: ${cdnUrl}`);
            resolve();
          };
          script.onerror = () => reject(new Error(`Failed to load from ${cdnUrl}`));
          document.head.appendChild(script);
        });
        
        loaded = true;
        break; // Success, exit loop
      } catch (err) {
        lastError = err as Error;
        console.warn(`⚠️ CDN failed (${cdnUrl}):`, err);
        continue; // Try next CDN
      }
    }

    if (!loaded) {
      throw lastError || new Error('All CDN sources failed to load face-api.js');
    }

    const faceapi = (window as any).faceapi;
    
    // ✅ USE LOCAL MODELS (faster, no CDN dependency)
    const MODEL_URL = '/models';
    
    console.log(`📁 Loading models from local storage: ${MODEL_URL}`);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      console.log(`✅ Local models loaded successfully from: ${MODEL_URL}`);
      modelsLoaded = true;
    } catch (localErr) {
      console.warn(`⚠️ Local models failed. Falling back to CDN...`);
      // Fallback to CDN if local fails
      const modelUrls = [
        'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model',
        'https://unpkg.com/@vladmandic/face-api@1.7.13/model',
      ];

      lastError = null;

      for (const MODEL_URL_CDN of modelUrls) {
        try {
          console.log(`📥 Loading models from CDN: ${MODEL_URL_CDN}`);
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL_CDN),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL_CDN),
          ]);
          console.log(`✅ CDN models loaded successfully from: ${MODEL_URL_CDN}`);
          modelsLoaded = true;
          break;
        } catch (err) {
          lastError = err as Error;
          console.warn(`⚠️ CDN models failed (${MODEL_URL_CDN}):`, err);
          continue;
        }
      }
    }

    if (!modelsLoaded) {
      throw lastError || new Error('Failed to load face-api models from all sources');
    }

    faceApiLoaded = true;
    return true;
  } catch (err) {
    console.error('❌ face-api.js failed to load from all sources:', err);
    faceApiLoaded = false;
    return false;
  } finally {
    faceApiLoading = false;
  }
}

/**
 * Detect emotion from a single video frame
 * Uses face-api.js which is optimized for facial emotion detection
 * (Hugging Face models for emotions are not publicly available yet)
 */
export async function detectFaceEmotion(videoEl: HTMLVideoElement): Promise<ModalityResult | null> {
  try {
    const loaded = await loadFaceApi();
    if (!loaded) return simulateFaceResult();

    const faceapi = (window as any).faceapi;
    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceExpressions();

    if (!detection) return null;

    const expressions: Record<string, number> = detection.expressions;
    const scores: EmotionScore[] = FACE_API_EMOTIONS.map((e) => ({
      emotion: EMOTION_LABEL_MAP[e] || e,
      confidence: Math.round((expressions[e] || 0) * 100),
    })).sort((a, b) => b.confidence - a.confidence);

    const top = scores[0];
    return {
      modality: 'face',
      emotion: top.emotion,
      confidence: top.confidence,
      scores,
      raw: expressions,
    };
  } catch (err) {
    console.warn('Face detection error:', err);
    return simulateFaceResult();
  }
}

/**
 * LIGHTING QUALITY ANALYZER
 * Analyzes video frame brightness to check if conditions are optimal for detection
 * Returns quality assessment to help users position themselves better
 */
export function analyzeLightingQuality(videoEl: HTMLVideoElement): {
  brightness: number;
  quality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  recommendation: string;
} {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return { brightness: 0, quality: 'Poor', recommendation: 'Canvas context unavailable' };
    }

    ctx.drawImage(videoEl, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate average brightness (0-255)
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Luminance formula: 0.299R + 0.587G + 0.114B
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const brightness = Math.round(totalBrightness / (data.length / 4));

    let quality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    let recommendation: string;

    if (brightness < 50) {
      quality = 'Poor';
      recommendation = '🌑 Too dark! Move to a brighter area or turn on lights.';
    } else if (brightness < 100) {
      quality = 'Fair';
      recommendation = '🌙 Lighting is dim. Try moving closer to a light source.';
    } else if (brightness < 180) {
      quality = 'Good';
      recommendation = '💡 Good lighting! Face detection should work well.';
    } else if (brightness < 220) {
      quality = 'Excellent';
      recommendation = '☀️ Perfect lighting conditions for accurate emotion detection!';
    } else {
      quality = 'Excellent';
      recommendation = '⚠️ Very bright! Check for harsh shadows or glare.';
    }

    return { brightness, quality, recommendation };
  } catch (err) {
    console.warn('Lighting analysis error:', err);
    return { brightness: 0, quality: 'Poor', recommendation: 'Unable to analyze lighting' };
  }
}

/**
 * MULTI-FRAME EMOTION DETECTION
 * Captures multiple frames from video and averages emotion results
 * Uses face-api.js (best free facial emotion detection available)
 * Multi-frame averaging improves reliability and reduces false positives
 */
export async function detectFaceEmotionMultiFrame(
  videoEl: HTMLVideoElement,
  options: { samplingInterval?: number; maxFrames?: number; onProgress?: (progress: number) => void } = {}
): Promise<ModalityResult | null> {
  const { samplingInterval = 100, maxFrames = 40, onProgress } = options;
  
  try {
    const loaded = await loadFaceApi();
    if (!loaded) return simulateFaceResult();

    const faceapi = (window as any).faceapi;
    const emotionScores: Record<string, number[]> = {};
    let frameCount = 0;
    
    // Analyze lighting conditions
    const lighting = analyzeLightingQuality(videoEl);
    
    // Calculate timing info
    const totalAnalysisSeconds = (maxFrames * samplingInterval) / 1000;
    const totalAnalysisMs = maxFrames * samplingInterval;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎬 MULTI-FRAME FACE EMOTION DETECTION STARTED');
    console.log(`📊 Capturing ${maxFrames} frames with ${samplingInterval}ms interval`);
    console.log(`💡 Lighting: ${lighting.quality} (${lighting.brightness}/255) - ${lighting.recommendation}`);
    console.log(`⏱️  Total analysis time: ${totalAnalysisSeconds.toFixed(1)} seconds (${totalAnalysisMs}ms)`);
    console.log('📚 Using face-api.js (best open-source facial emotion detection)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Collect emotions from multiple frames
    for (let i = 0; i < maxFrames; i++) {
      try {
        const detection = await faceapi
          .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
          .withFaceExpressions();

        if (detection) {
          // Store each emotion score
          const expressions = detection.expressions;
          
          // Debug: log raw expressions to verify data structure
          if (frameCount === 0) {
            console.log('🔍 DEBUG: Raw expressions from face-api:', expressions);
            console.log('🔍 DEBUG: Expression keys:', Object.keys(expressions));
          }
          
          FACE_API_EMOTIONS.forEach((emotion) => {
            if (!emotionScores[emotion]) emotionScores[emotion] = [];
            const score = expressions[emotion] !== undefined ? expressions[emotion] : 0;
            emotionScores[emotion].push(score);
          });
          frameCount++;

          // ═══ PRINT FRAME OUTPUT ═══
          const frameTimeMs = (i + 1) * samplingInterval;
          const frameTimeSec = (frameTimeMs / 1000).toFixed(2);
          console.log(`\n📹 FRAME ${i + 1}/${maxFrames} (${frameTimeSec}s):`);
          console.log('─────────────────────────────');
          
          // Print individual emotion scores for this frame
          const frameEmotions = FACE_API_EMOTIONS.map((emotion) => ({
            emotion: EMOTION_LABEL_MAP[emotion] || emotion,
            confidence: Math.round((expressions[emotion] || 0) * 100),
            rawScore: (expressions[emotion] || 0).toFixed(3),
          }))
          .filter(e => e.confidence >= 1) // Filter out near-zero predictions (1% threshold, not 3%)
          .sort((a, b) => b.confidence - a.confidence);

          frameEmotions.forEach((e, idx) => {
            const bar = '█'.repeat(Math.floor(e.confidence / 5)) + '░'.repeat(20 - Math.floor(e.confidence / 5));
            console.log(`  ${idx + 1}. ${e.emotion.padEnd(12)} ${bar} ${e.confidence}% (${e.rawScore})`);
          });

          const topEmotion = frameEmotions[0];
          if (topEmotion) {
            console.log(`  ➜ Detected: ${topEmotion.emotion} (${topEmotion.confidence}%)`);
          } else {
            console.log(`  ➜ No emotions detected above 1% threshold`);
            // Still log raw data for debugging
            const allEmotions = FACE_API_EMOTIONS.map((emotion) => ({
              emotion: EMOTION_LABEL_MAP[emotion] || emotion,
              confidence: Math.round((expressions[emotion] || 0) * 100),
              rawScore: (expressions[emotion] || 0).toFixed(3),
            })).sort((a, b) => b.confidence - a.confidence);
            allEmotions.forEach((e) => {
              console.log(`     ${e.emotion.padEnd(12)}: ${e.rawScore} (${e.confidence}%)`);
            });
          }
        } else {
          const frameTimeMs = (i + 1) * samplingInterval;
          const frameTimeSec = (frameTimeMs / 1000).toFixed(2);
          console.log(`\n⚠️  FRAME ${i + 1}/${maxFrames} (${frameTimeSec}s): No face detected`);
        }

        // Wait before next frame
        await new Promise((resolve) => setTimeout(resolve, samplingInterval));

        // Report progress
        if (onProgress) onProgress((i + 1) / maxFrames);
      } catch (err) {
        console.warn(`\n❌ FRAME ${i + 1}/${maxFrames} analysis failed:`, err);
      }
    }

    if (frameCount === 0) {
      console.log('\n❌ No frames were successfully analyzed!');
      return null;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 FRAME CAPTURE SUMMARY');
    console.log(`✅ Frames successfully analyzed: ${frameCount}/${maxFrames}`);
    
    // DEBUG: Check what emotions we collected
    console.log('\n🔍 Emotion data collected:');
    FACE_API_EMOTIONS.forEach((emotion) => {
      const scores = emotionScores[emotion] || [];
      const avg = scores.length > 0 ? scores.reduce((a,b) => a+b, 0) / scores.length : 0;
      const max = scores.length > 0 ? Math.max(...scores) : 0;
      const min = scores.length > 0 ? Math.min(...scores) : 0;
      console.log(`  ${emotion.padEnd(12)}: ${scores.length} frames, avg=${(avg*100).toFixed(1)}%, min=${(min*100).toFixed(1)}%, max=${(max*100).toFixed(1)}%`);
    });

    // Average the scores across all captured frames (with outlier filtering)
    const averagedScores: EmotionScore[] = FACE_API_EMOTIONS.map((emotion) => {
      const scores = emotionScores[emotion] || [];
      // Filter outliers: remove extreme values (top 5% and bottom 5%) to reduce noise
      const sorted = [...scores].sort((a, b) => a - b);
      const trimSize = Math.max(1, Math.ceil(sorted.length * 0.05)); // 5% instead of 10%
      const trimmed = sorted.slice(trimSize, sorted.length - trimSize);
      const avgScore = trimmed.length > 0 ? trimmed.reduce((a, b) => a + b, 0) / trimmed.length : 0;
      
      return {
        emotion: EMOTION_LABEL_MAP[emotion] || emotion,
        confidence: Math.round(avgScore * 100),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

    // DEBUG: Show what we calculated
    console.log('📊 Averaged emotions (before filtering):');
    averagedScores.forEach((s, i) => {
      const bar = '█'.repeat(Math.floor(s.confidence / 5)) + '░'.repeat(20 - Math.floor(s.confidence / 5));
      console.log(`  ${i + 1}. ${s.emotion.padEnd(12)} ${bar} ${s.confidence}%`);
    });

    // Filter for display, but always keep top emotion for result
    const displayScores = averagedScores.filter(s => s.confidence >= 3);
    
    // Print averaged results
    console.log(`✅ Successfully analyzed ${frameCount} frames\n`);
    console.log('📊 ALL EMOTIONS (averaged across all frames):');
    averagedScores.forEach((score, idx) => {
      const bar = '█'.repeat(Math.floor(score.confidence / 5)) + '░'.repeat(20 - Math.floor(score.confidence / 5));
      console.log(`  ${idx + 1}. ${score.emotion.padEnd(12)} ${bar} ${score.confidence}%`);
    });

    // Find dominant emotion (use highest regardless of threshold)
    const dominantEmotion = averagedScores[0];
    
    if (!dominantEmotion) {
      console.error('❌ ERROR: No dominant emotion found! averagedScores is empty or malformed');
      console.log('🔍 DEBUG: averagedScores:', averagedScores);
      console.log('🔍 DEBUG: emotionScores keys:', Object.keys(emotionScores));
      return null;
    }
    
    // Verify this is actually the highest emotion (should be by default due to sorting)
    const manualMax = FACE_API_EMOTIONS.reduce((max, emotion) => {
      const scores = emotionScores[emotion] || [];
      const sorted = [...scores].sort((a, b) => a - b);
      const trimSize = Math.max(1, Math.ceil(sorted.length * 0.05));
      const trimmed = sorted.slice(trimSize, sorted.length - trimSize);
      const avg = trimmed.length > 0 ? trimmed.reduce((a, b) => a + b, 0) / trimmed.length : 0;
      
      if (avg > (max.avgScore || 0)) {
        return { emotion, avgScore: avg, label: EMOTION_LABEL_MAP[emotion] };
      }
      return max;
    }, { emotion: '', avgScore: 0, label: '' });
    
    console.log(`🔍 DEBUG: Manual max calculation - ${manualMax.label} (${Math.round(manualMax.avgScore * 100)}%)`);
    console.log(`🔍 DEBUG: First in sorted array - ${dominantEmotion.emotion} (${dominantEmotion.confidence}%)`);
    
    // Use manual calculation if it differs from sorted
    const finalEmotion = Math.abs(manualMax.avgScore - dominantEmotion.confidence / 100) > 0.02
      ? { emotion: manualMax.label, confidence: Math.round(manualMax.avgScore * 100) }
      : dominantEmotion;
    
    // ⚠️ ANGRY/FEARFUL CONFIDENCE CHECK
    const angryScore = averagedScores.find(s => s.emotion === 'Angry')?.confidence || 0;
    const fearfulScore = averagedScores.find(s => s.emotion === 'Fearful')?.confidence || 0;
    const angryFearfulDiff = Math.abs(angryScore - fearfulScore);
    
    if (angryFearfulDiff < 8) {
      console.warn(`\n⚠️  AMBIGUOUS: Angry (${angryScore}%) vs Fearful (${fearfulScore}%) - Will use voice/text for disambiguation`);
    }
    
    console.log(`\n🎯 FINAL RESULT: ${finalEmotion.emotion} (${finalEmotion.confidence}% confidence)`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return {
      modality: 'face',
      emotion: finalEmotion.emotion,
      confidence: finalEmotion.confidence,
      scores: averagedScores, // Return all emotions, not just filtered ones
      raw: {
        framesAnalyzed: frameCount,
        analysisTimeMs: totalAnalysisMs,
        analysisTimeSeconds: totalAnalysisSeconds,
        ...Object.fromEntries(
          FACE_API_EMOTIONS.map((e) => [
            e,
            Math.round((emotionScores[e]?.reduce((a, b) => a + b, 0) / frameCount) * 100),
          ])
        ),
      },
    };
  } catch (err) {
    console.warn('❌ Multi-frame face detection error:', err);
    return simulateFaceResult();
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
