# EmpathAI — Complete Project Explanation
### For Clients · Feynman Method · Deep Technical + Plain English

---

## Table of Contents

1. [What is EmpathAI? (30-second version)](#1-what-is-empathai)
2. [The Core Problem We Solve](#2-the-core-problem-we-solve)
3. [How the System Works — Big Picture](#3-how-the-system-works--big-picture)
4. [Face Emotion Detection — Deep Dive](#4-face-emotion-detection)
5. [Voice Emotion Detection — Deep Dive](#5-voice-emotion-detection)
6. [Text Emotion Detection — Deep Dive](#6-text-emotion-detection)
7. [Multimodal Fusion — How We Combine All Three](#7-multimodal-fusion)
8. [Guardian Alert System](#8-guardian-alert-system)
9. [Emotion-Aware AI Chat](#9-emotion-aware-ai-chat)
10. [Emotion History & MongoDB](#10-emotion-history--mongodb)
11. [Real-Time WebSocket Streaming](#11-real-time-websocket-streaming)
12. [Authentication & Security](#12-authentication--security)
13. [All Algorithms Used — Why We Chose Each](#13-all-algorithms-used--why-we-chose-each)
14. [Full Tech Stack Explained](#14-full-tech-stack-explained)
15. [System Architecture — End to End](#15-system-architecture--end-to-end)
16. [Accuracy & Performance Numbers](#16-accuracy--performance-numbers)
17. [Pages & User Journey](#17-pages--user-journey)

---

## 1. What is EmpathAI?

**Plain English:**
> EmpathAI is a system that watches your face, listens to your voice, and reads what you type — all at the same time — to figure out how you're feeling emotionally. It then sends an automatic email to a trusted person (like a parent or caregiver) if it detects the same worrying emotion three times in a row.

**Technical one-liner:**
> A real-time multimodal emotion recognition system using CNN (face), wav2vec2 Transformer (voice), and LLM-based NLP (text), fused with weighted averaging and wrapped in a guardian alerting pipeline via SendGrid.

**Who is it for?**
- Mental health monitoring platforms
- Elder care or child care facilities
- Corporate wellness programs
- Telehealth / therapy session assistants
- Any application that needs to understand how a user truly feels, not just what they say

---

## 2. The Core Problem We Solve

### The Problem

Humans communicate emotion through **three channels simultaneously**:
- Their **face** (micro-expressions, eye movement, muscle tension)
- Their **voice** (pitch, energy, trembling, speed)
- Their **words** (what they actually say or write)

Most systems only use one of these. A camera-only system misses when someone speaks in a shaky voice but keeps a neutral face. A text-only system misses sarcasm and tone. A voice-only system misses someone who's silently crying.

### Our Solution

EmpathAI reads **all three at the same time** and combines them into a single, more accurate emotion result. Think of it like three expert witnesses each giving testimony — then a judge combining their evidence to reach the most accurate verdict.

### The Safety Problem We Also Solve

When someone is in distress, they often can't speak up themselves. A guardian system that automatically notifies a trusted person — without the user needing to do anything — is genuinely life-saving in some contexts.

---

## 3. How the System Works — Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                           │
│                                                                 │
│   📸 Webcam     🎤 Microphone     ⌨️  Text Input               │
│       ↓               ↓                ↓                        │
│   Face frames      Audio file      Typed text                   │
└──────────┬────────────┬────────────────┬────────────────────────┘
           │            │                │
           ▼            ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Flask / Python)                     │
│                                                                 │
│   DeepFace CNN    Kvilla + SUPERB    Ollama LLM                 │
│   (ResNet50)      wav2vec2 Fusion    (llama3.1:8b)              │
│       ↓               ↓                ↓                        │
│   emotion: sad    emotion: sad    emotion: sad                  │
│   conf: 72%       conf: 88%       conf: 91%                     │
│                                                                 │
│               ↓ WEIGHTED FUSION ↓                              │
│                                                                 │
│         Final: SAD — 85% confidence                            │
│                                                                 │
│   ↓ Save to MongoDB    ↓ Check alert rule                      │
│   ↓ Emit via WebSocket  ↓ Send SendGrid email if 3× same       │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FRONTEND (React / TypeScript)                  │
│                                                                 │
│   Live emotion display · History · Chat · Alerts · Settings    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Face Emotion Detection

### Plain English

Imagine you take a photo of someone's face every half second. For each photo, you crop out just the face, shrink it to a standard size, and then feed it to a neural network that has learned — from millions of examples — what each emotion looks like on a human face. The network outputs a score for each of the 7 emotions, and the highest score wins.

To prevent false positives (one weird grimace triggering a "sad" reading), we require the **same emotion to appear in 10 consecutive frames** before we lock in the result.

### Step-by-Step Technical Flow

```
Webcam (live video)
    ↓
drawImage() on HTML Canvas → toDataURL('image/jpeg', 0.8)
    ↓
POST /api/emotion/detect/face/stream   [every 500ms]
    ↓
base64 → NumPy array via cv2.imdecode
    ↓
CLAHE brightness enhancement (if avg brightness < 80/255)
    ↓
OpenCV Haar Cascade → detect face rectangles
    ↓
Crop face ROI (Region of Interest) from frame
    ↓
Resize to 224×224 → ToTensor() → Normalize
  (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ↓
ResNet50 CNN → 7-class logits
    ↓
Softmax → probability distribution → argmax → top emotion
    ↓
EmotionStabilityDetector: requires 10 consecutive same emotions
    ↓
Return { emotion, confidence, scores[] }
```

### Algorithms Used

#### Haar Cascade Classifier (Face Detection)
- **What it is:** A machine learning classifier trained to detect faces using Haar-like features (rectangular patterns of light/dark)
- **Why we use it:** Extremely fast (runs in real-time, <5ms per frame), reliable for frontal faces, no GPU required
- **Alternative we considered:** MTCNN (slower), YOLO (overkill for face-only detection)

#### CLAHE — Contrast Limited Adaptive Histogram Equalization (Brightness Fix)
- **What it is:** An image processing algorithm that enhances local contrast in dark images
- **Feynman explanation:** Imagine a photo taken in a dark room. CLAHE looks at small regions of the image and stretches the brightness range in each region — so dark faces become visible without over-brightening bright areas
- **Why we use it:** Real-world users don't always sit in perfect lighting. CLAHE ensures the CNN can "see" the face properly even in low light
- **Trigger:** Only applied if average pixel brightness < 80 out of 255

#### ResNet50 CNN (Emotion Classification)
- **What it is:** A 50-layer deep Convolutional Neural Network originally designed for ImageNet (1000-class image classification), modified for our 7-emotion task
- **Feynman explanation:** A CNN works like a series of filters. The first layers detect edges and corners. Middle layers detect eyes, noses, mouths. Deep layers detect patterns like "furrowed brow + downturned mouth = sad". ResNet50 specifically has "skip connections" that let signals jump over layers — solving the vanishing gradient problem that makes very deep networks hard to train
- **Architecture change:** We replaced the final 1000-class layer with a 7-class layer (`nn.Linear(2048, 7)`) for our emotion labels
- **Why ResNet50 not a simpler CNN?** Transfer learning. ResNet50 pre-trained on ImageNet already knows how to detect faces, eyes, mouths, and expressions. We just retrain the final layer for 7 emotions. This gives ~75-85% accuracy with minimal training data

#### Emotion Stability Algorithm
- **What it is:** A sliding window of the last N frames; only locks in an emotion if N consecutive frames agree
- **Parameters:** N=10 frames, 40% minimum confidence
- **Why:** Micro-expressions, head turns, and lighting changes cause momentary wrong predictions. Requiring 10 consecutive agreements eliminates noise and ensures the displayed emotion is real

### 7 Emotions Detected
`angry` · `disgusted` · `fearful` · `happy` · `neutral` · `sad` · `surprised`

---

## 5. Voice Emotion Detection

### Plain English

When you speak, your voice carries emotion in ways words don't. An angry person speaks louder and faster. A sad person speaks quietly and slowly, with a lower pitch. A fearful person may stammer or tremble. Our system records your voice, cuts it into 2.5-second pieces, and runs two separate AI models on each piece simultaneously. Then it combines both results with a weighted vote — trusting the primary model more, but using the backup model to catch cases the primary misses.

### Step-by-Step Technical Flow

```
Microphone → getUserMedia() → MediaRecorder API
    ↓
Collect audio chunks → Blob → WAV file
    ↓
POST /api/emotion/voice/detect  (multipart/form-data)
    ↓
Save to temp file
    ↓
AudioProcessor.load_and_normalize()
  → librosa.load(sr=16000, mono=True)
  → amplitude normalize to [-1, 1]
    ↓
chunk_audio() → 2.5 second segments
  → skip chunks >50% silence (RMS energy check)
    ↓
For each chunk — PARALLEL:
  ├─ Kvilla wav2vec2 → softmax → emotion + scores
  └─ SUPERB ER wav2vec2 → softmax → emotion + scores
    ↓
Aggregate chunk results (average scores per model)
    ↓
KvillaSuperBFusion:
  final_score[e] = 0.65 × kvilla[e] + 0.35 × superb[e]
  (if both agree: confidence × 1.15 agreement boost)
    ↓
argmax → final emotion + confidence
    ↓
Return { emotion, confidence, all_scores, model_type, audio_features }
```

### Models Used

#### wav2vec2 — Transformer-based Audio Feature Extractor
- **What it is:** A self-supervised Transformer model from Meta AI (Facebook Research) pre-trained on 960 hours of LibriSpeech audio
- **Feynman explanation:** Imagine a model that learned the structure of human speech by listening to thousands of hours of audio — without any labels. It learned that certain sound patterns mean "consonant", others mean "vowel stressed in excitement", etc. It converts raw audio waveforms into 768-dimensional feature vectors that capture the emotional "fingerprint" of speech
- **How it works technically:** The audio waveform is passed through a CNN feature encoder (7 CNN layers) that produces local features, then into a Transformer encoder with 12 attention layers that captures long-range dependencies across the audio
- **Key:** It operates on the raw waveform at 16kHz — no manual feature engineering (no MFCC computation needed)

#### Kvilla — Primary Model (65% weight)
- **What it is:** A wav2vec2 model fine-tuned specifically on emotion datasets
- **Training data:** RAVDESS (actors performing emotions), CREMA-D (community response emotion), TESS (Toronto emotional speech set)
- **Architecture:** `Wav2Vec2ForSequenceClassification` — wav2vec2 backbone + classification head on top
- **Why primary:** Fine-tuned on real emotional speech data → ~85% test accuracy on held-out data
- **Output:** Probability scores for all 7 emotions per audio chunk

#### SUPERB ER — Backup/Stabilizer Model (35% weight)
- **What it is:** `superb/wav2vec2-base-superb-er` — the Speech processing Universal PERformance Benchmark emotion recognition model
- **Why we include it:** When Kvilla is uncertain (e.g., ambiguous speech), SUPERB ER provides a second opinion. When both agree, the agreement boost (+15% confidence) signals a high-quality prediction
- **Why 35% weight:** Kvilla is the stronger model; SUPERB provides diversity, not leadership

#### Audio Preprocessing Pipeline
- **librosa:** Industry-standard Python audio library — handles loading, resampling, silence detection
- **16kHz mono:** wav2vec2 was trained on 16kHz audio. Using the wrong sample rate would be like showing a doctor an X-ray of the wrong body part
- **2.5s chunks:** wav2vec2 Transformers have a sequence length limit. Chunking ensures every part of longer audio gets analysed. Silence chunks are skipped to avoid wasting compute on gaps
- **Silence detection:** Mel spectrogram energy is computed; chunks averaging >20dB below mean energy are discarded

#### Fusion Logic — Why Weighted Average + Agreement Boost?
- **Weighted average:** A simple but powerful ensemble method. If two experts disagree, take a weighted consensus. 65/35 reflects our empirical finding that Kvilla is more accurate but SUPERB catches some edge cases
- **Agreement boost (×1.15):** When two independent models trained on different data reach the same conclusion, that is strong evidence — so we increase confidence. This is inspired by ensemble learning theory

---

## 6. Text Emotion Detection

### Plain English

You type "I feel so anxious about tomorrow". A human reading that would immediately feel that it's fear/anxiety, not sadness — even though the words might look similar on the surface. Large Language Models (LLMs) have read billions of sentences and understand context, nuance, and idioms at a level that older keyword-matching approaches cannot match.

### Step-by-Step Technical Flow

```
User types text in input field
    ↓
analyzeText() → detectTextEmotion(text)
    ↓
POST /api/emotion/detect/text
    ↓
TextEmotionTransformer.detect_emotion_with_scores(text)
    ↓
Build structured classification prompt:
  "You are a precise emotion classifier..."
  [7 emotion definitions with nuanced descriptions]
  [Disambiguation rules: anxious→fearful NOT sad]
  [Few-shot examples]
  "Return strict JSON only"
    ↓
POST http://localhost:11434/api/generate
  model: llama3.1:8b, format: json, stream: false
    ↓
Parse JSON response: { emotion, confidence, scores }
    ↓
_normalize_emotion(): alias map
  anger→angry, joy→happy, fear→fearful, sadness→sad, etc.
    ↓
Return { emotion, confidence, all_scores, text_length }
```

### Model Used

#### Ollama + llama3.1:8b (Large Language Model)
- **What it is:** Meta's Llama 3.1 model with 8 billion parameters, run locally via Ollama
- **Feynman explanation:** An LLM has been trained on essentially the entire internet — books, articles, Reddit, scientific papers, conversations. It has learned that "I'm devastated" means sad, "I'm on edge" means fearful/anxious, and "This is disgusting" means disgusted. It understands context, sarcasm, idioms, and cultural phrases that keyword-matching systems miss completely
- **Why Ollama (local)?** Privacy — user text never leaves the server. Cost — no per-API-call charges. Speed — ~2-5 seconds per request on CPU
- **Why 8b parameters?** Balance between accuracy (larger is better) and speed (8b runs acceptably on CPU without GPU)

#### Prompt Engineering (Why This Matters)
- Naive prompting ("classify this text's emotion") produces inconsistent output — LLMs may return "anxiety" instead of "fearful", or format JSON incorrectly
- Our prompt includes:
  - **Exact taxonomy:** The 7 canonical labels, each with 4-5 synonym definitions
  - **Disambiguation rules:** "anxious → fearful NOT sad" — because LLMs sometimes confuse these
  - **Few-shot examples:** 7 example sentences pre-labelled, so the model calibrates its output
  - **Format enforcement:** `format: json` in the Ollama API forces valid JSON output
  - **Score requirement:** All 7 emotion probabilities must sum to ~1.0

#### Alias Normalization
The LLM might return `"anger"` instead of `"angry"`. We maintain an alias map that standardises all variants to our canonical 7 labels. This prevents silent failures where a valid detection is discarded because of a label mismatch.

---

## 7. Multimodal Fusion

### Plain English

Each detector gives its best guess. The fusion engine is like a judge that hears three witnesses (face, voice, text), weights their testimony based on reliability, and delivers the final verdict.

### Fusion Algorithm

```typescript
const FUSION_WEIGHTS = {
  face:  0.35,   // 35%
  voice: 0.40,   // 40%
  text:  0.25,   // 25%
};
```

**Step 1:** For each modality that returned a result, gather its scores for all 7 emotions.

**Step 2:** Weight each modality's scores by its weight factor.

**Step 3:** Sum the weighted scores across all active modalities.

**Step 4:** argmax → final fused emotion.

**Step 5:** Normalize confidence relative to the highest-scoring emotion.

### Why These Weights?

| Modality | Weight | Reason |
|----------|--------|--------|
| Voice    | 40%    | Voice is the hardest to fake — it captures involuntary physiological responses (trembling, breathlessness). Also best at distinguishing angry (loud, fast) from fearful (trembling, soft) |
| Face     | 35%    | Reliable in good lighting but confuses angry/fearful (both involve furrowed brows). Reduced from 50% after empirical testing |
| Text     | 25%    | Highly accurate for unambiguous cases but users can consciously choose what they type. Supplementary rather than primary |

### What Happens With Only 1 or 2 Modalities?

If the user only types text (no camera, no voice), the system uses only the text result. The weights are re-normalized to sum to 1.0 across whatever modalities are available. Fusion never forces a result from an absent modality.

---

## 8. Guardian Alert System

### Plain English

If the system detects the same distressing emotion three times in a row — across any combination of face, voice, or text — it sends an email to the user's guardian (parent, caregiver, therapist). The 10-minute cooldown prevents the same alert from spamming the guardian repeatedly.

### Trigger Logic

```
Detection 1: Sad (75%)   → consecutive count = 1
Detection 2: Sad (82%)   → consecutive count = 2
Detection 3: Sad (79%)   → consecutive count = 3 → TRIGGER ALERT
Detection 4: Sad (88%)   → cooldown active → no alert sent
```

**Reset condition:** Any different emotion resets the counter to 0.

### Technical Implementation

- **Frontend:** `useGuardianAlert` hook + `guardianAlertService.ts`
- **Email service:** SendGrid API with HTML email template
- **Timestamp:** IST (Indian Standard Time) conversion applied
- **Alert storage:** MongoDB `alerts` collection
- **Status lifecycle:** `active` → `sent` → `dismissed` / `failed`

### Alert Severity

| Severity | Condition |
|----------|-----------|
| `warning` | Moderate emotions (sad, surprised, disgusted) 3× in a row |
| `critical` | High-intensity distress (angry, fearful) 3× in a row |

### Why 3 Consecutive and Not 3 Total?

3 **consecutive** detections = a sustained emotional state, not random noise. If the user was angry for 1 second, then happy, then sad — that's normal. But if every reading says "fearful", something is genuinely happening. Consecutive ensures temporal continuity.

### Guardian Email

- **Provider:** SendGrid (transactional email)
- **Content:** Emotion name, confidence %, intensity level, timestamp (IST), session context
- **Branding:** EmpathAI HTML template

---

## 9. Emotion-Aware AI Chat

### Plain English

The chat page is an AI assistant that knows how you're currently feeling. If you've just been detected as sad, the AI shifts its tone — offering empathy, gentler phrasing, and supportive responses. If you're happy, it matches that energy. The emotion from the analysis page is passed as context to the chat.

### How It Works

1. User emotion from latest session is stored in app state
2. Chat sends a system prompt to the AI that includes: `"The user is currently feeling [emotion] at [confidence]% confidence. Adjust your tone accordingly."`
3. The AI generates responses calibrated to the user's emotional state

---

## 10. Emotion History & MongoDB

### Data Storage

Every emotion detection session is saved to MongoDB Atlas with:
- User ID (from JWT)
- Timestamp (UTC → IST for display)
- Individual modality results (face, voice, text)
- Fused final result
- Confidence scores for all 7 emotions
- Session metadata

### Why MongoDB?

- **Schema flexibility:** Emotion records have variable fields (some sessions have voice, some don't). MongoDB's document model handles this naturally without NULL columns
- **Atlas:** Cloud-hosted, globally replicated, no server management needed
- **Performance:** Single document reads for history page queries are fast; no complex JOIN operations needed

### History Page

The `/history` page shows a chronological list of past sessions with:
- Final emotion and confidence
- Which modalities were used
- Score breakdown for all 7 emotions
- Timestamp

---

## 11. Real-Time WebSocket Streaming

### Plain English

Instead of making a new HTTP request every time you want an emotion update, WebSocket keeps a persistent two-way connection open between the browser and server. The server can push emotion updates the instant they're computed, without the browser needing to ask.

### Technical Implementation

- **Library:** Flask-SocketIO (backend) / Socket.IO client (frontend)
- **Transport:** WebSocket with HTTP long-polling fallback
- **Events emitted:**
  - `emotion_update` — new fused emotion result
  - `alert_triggered` — guardian alert fired
  - `session_status` — session start/stop

### Why WebSocket over Polling?

HTTP polling = "Is there anything new?" every N seconds → wasteful, delayed.
WebSocket = "I'll tell you the moment something changes" → instant, efficient.

---

## 12. Authentication & Security

### JWT Authentication

- **Registration:** Password hashed with `bcrypt` (salt rounds: 12) before storage in MongoDB
- **Login:** Hash comparison → issue JWT with user_id payload + expiry
- **Protected routes:** `@token_required` decorator extracts and validates JWT on every protected API call
- **Token storage:** `localStorage` on frontend (short-lived tokens)

### Why bcrypt?

bcrypt is specifically designed for password hashing — it is intentionally slow (controlled by salt rounds), which makes brute-force attacks computationally infeasible. SHA-256 or MD5 are not acceptable for passwords because they're too fast.

### Why JWT?

Stateless authentication — the server doesn't need to store session data. Each token is self-contained and verifiable. Scales horizontally across multiple server instances without shared session storage.

### OWASP Compliance

- SQL injection: N/A (MongoDB, no SQL)
- NoSQL injection: Input validated before all DB queries
- XSS: React's JSX rendering escapes all user content by default
- CORS: Configured to allow only the frontend origin
- Sensitive data: `.env` file gitignored, never committed

---

## 13. All Algorithms Used — Why We Chose Each

| Algorithm | Where Used | Why Chosen |
|-----------|-----------|------------|
| **Haar Cascade** | Face detection | Real-time speed (<5ms), no GPU needed, reliable for frontal faces |
| **CLAHE** | Image enhancement | Handles dark/uneven lighting without global over-brightening |
| **ResNet50 CNN** | Face emotion classification | Transfer learning from ImageNet; skip connections prevent vanishing gradients in deep networks; 75-85% accuracy with minimal training |
| **Softmax** | All 3 models (output layer) | Converts raw logits to a probability distribution that sums to 1.0 — interpretable as confidence per emotion |
| **wav2vec2 Transformer** | Voice feature extraction | Self-supervised pre-training on raw audio; captures prosodic features (pitch, rhythm, stress) that MFCC misses |
| **Wav2Vec2ForSequenceClassification** | Kvilla voice model | End-to-end trainable classifier on top of wav2vec2; fine-tuned on RAVDESS/CREMA-D/TESS |
| **SUPERB ER** | Voice backup model | Independently trained on different data → diverse predictions → ensemble benefit |
| **Weighted Average Fusion** | Multimodal result | Simple, interpretable, and effective ensemble method. Each weight reflects real-world reliability of that modality |
| **Agreement Boost** | Voice fusion | Statistically, independent model agreement is stronger evidence → justified confidence increase |
| **Mel Spectrogram + RMS** | Silence detection | Energy-based silence detection is fast and reliable for removing dead audio chunks |
| **llama3.1:8b LLM** | Text emotion | Contextual understanding exceeds all traditional NLP approaches (BERT, keyword matching, rule-based) for nuanced emotion text |
| **Prompt Engineering** | Text emotion | Structured few-shot prompts reduce LLM hallucination and force consistent output format |
| **JWT (HS256)** | Authentication | Stateless, verifiable, scalable — standard for REST APIs |
| **bcrypt** | Password hashing | Designed for passwords; computationally slow = brute-force resistant |
| **EmotionStabilityDetector** | Face streaming | Sliding window majority — eliminates noise/micro-expression false positives |
| **Consecutive Count Rule** | Guardian alerts | Temporal continuity check — sustained state vs. momentary fluctuation |

---

## 14. Full Tech Stack Explained

### Frontend
| Technology | Role | Why |
|-----------|------|-----|
| **React 19** | UI framework | Component model, reactive state, fast re-renders |
| **TypeScript** | Type safety | Catches bugs at compile time; essential for a complex multi-modality state system |
| **Vite** | Build tool | 10-100× faster than Webpack for dev server startup |
| **Tailwind CSS** | Styling | Utility-first; no CSS file bloat; consistent design system |
| **Socket.IO client** | Real-time | WebSocket with fallback |

### Backend
| Technology | Role | Why |
|-----------|------|-----|
| **Python 3.x** | Language | Dominates ML ecosystem; best library support for PyTorch, librosa, OpenCV |
| **Flask** | Web framework | Lightweight, minimal overhead; ideal for ML-serving APIs |
| **Flask-SocketIO** | WebSocket | Seamless Socket.IO integration with Flask |
| **PyTorch** | ML runtime | Industry standard for deep learning; dynamic computation graph; excellent for Transformer models |
| **OpenCV** | Image processing | Haarcascade, image decode/encode, color conversion |
| **librosa** | Audio processing | Standard Python audio analysis library; mel spectrogram, RMS, resampling |
| **HuggingFace Transformers** | wav2vec2 models | Pre-trained model weights and processor utilities |
| **Ollama** | LLM runtime | Local LLM inference without GPU requirement (runs on CPU) |
| **PyJWT + bcrypt** | Auth | JWT issuance and password hashing |

### Infrastructure
| Technology | Role | Why |
|-----------|------|-----|
| **MongoDB Atlas** | Database | Flexible document store; cloud-hosted; no schema migrations |
| **SendGrid** | Email | Reliable transactional email at scale; HTML template support |
| **Cloudinary** | Media storage | CDN-backed image/video storage; transformation API |

---

## 15. System Architecture — End to End

```
Browser (React 19 SPA)
│
├── /analyze page
│   ├── useEmotionStream hook    → face frames every 500ms
│   ├── VoiceEmotionDetector     → records audio, uploads WAV
│   └── useTextAnalysis hook     → sends typed text
│
├── Services Layer
│   ├── emotionApi.ts            → HTTP calls to Flask
│   ├── emotionWebSocket.ts      → Socket.IO connection
│   └── guardianAlertService.ts  → checks 3× rule, calls SendGrid
│
└── State: fused emotion → pages (results, history, chat, alerts)

──────────────────────────────────────────────
REST API (Flask) — Port 5000
│
├── /api/auth/register  POST    → bcrypt + MongoDB + JWT
├── /api/auth/login     POST    → verify + JWT
│
├── /api/emotion/detect/face/stream  POST  → DeepFace + ResNet50
├── /api/emotion/detect/text         POST  → Ollama llama3.1:8b
├── /api/emotion/voice/detect        POST  → Kvilla + SUPERB fusion
│
├── /api/alerts/                     GET/POST  → MongoDB alerts
├── /api/history/                    GET       → MongoDB sessions
└── /api/settings/guardian-emails    GET/POST  → MongoDB user prefs

Socket.IO  → emotion_update events → real-time frontend sync

──────────────────────────────────────────────
ML Layer
│
├── FaceEmotionCNN      (ResNet50, PyTorch)
├── KvillaSuperBFusion  (wav2vec2 × 2, PyTorch + HuggingFace)
└── TextEmotionTransformer (Ollama HTTP API)

──────────────────────────────────────────────
Data Layer
│
├── MongoDB Atlas   → users, sessions, alerts, guardian emails
└── Cloudinary CDN  → media file storage
```

---

## 16. Accuracy & Performance Numbers

| Modality | Model | Accuracy | Latency |
|----------|-------|----------|---------|
| Face | ResNet50 + DeepFace | 75-85% | ~200ms per frame |
| Voice | Kvilla + SUPERB fusion | ~85% | 200-500ms per chunk (CPU) |
| Text | Ollama llama3.1:8b | ~90%+ for clear text | 2-5s (CPU) |
| **Fused** | Weighted average | **Higher than any single model** | Adds negligibly |

### Why Fusion Beats Any Single Model

Consider detecting "fearful" — a user who is scared may:
- Keep a controlled facial expression (face model misses it)
- Speak in a trembling voice (voice model catches it)
- Type "I'm so scared" (text model catches it)

Any single model would only see part of the picture. The fusion sees all three signals and amplifies agreement.

### Voice Model Load Time
- First startup: ~5-10 seconds (downloads from HuggingFace Hub if weights not cached)
- Subsequent: <2 seconds (weights cached locally)
- Memory usage: ~2-2.5 GB RAM (both models loaded simultaneously)

---

## 17. Pages & User Journey

### `/analyze` — Main Detection Page
The core page. User activates camera, records voice, and/or types text. All three run simultaneously or in any combination. Results display live. Guardian alert logic monitors every result.

### `/results` — Last Session Results
Detailed breakdown of the most recent analysis — all 3 modalities, individual scores, fused result, confidence distribution chart.

### `/history` — Past Sessions
Timeline of all past emotion detection sessions pulled from MongoDB. Filterable by date. Each entry shows the final fused emotion + which modalities were used.

### `/chat` — Emotion-Aware AI Chat
AI chatbot whose system prompt is dynamically modified to match the user's current detected emotion. Sad user → empathetic, supportive responses. Happy user → energetic, engaged responses.

### `/alerts` — Guardian Alert History
Full list of all past guardian alerts with emotion, severity, timestamp (IST), and delivery status. Unread count shown in sidebar badge.

### `/settings` — Configuration
- Add/remove guardian email addresses
- Configure alert preferences
- Stored in MongoDB (per user)

---

## Summary

EmpathAI is not one AI model — it is an **AI pipeline** that combines:

1. **Computer Vision** (CNN) for facial expression recognition
2. **Speech AI** (wav2vec2 Transformers × 2) for vocal emotion
3. **Natural Language AI** (LLM) for text sentiment
4. **Ensemble Learning** (weighted fusion) to combine all three
5. **Real-time streaming** (WebSocket) for live delivery
6. **Safety system** (guardian alerts) for proactive notification
7. **Secure backend** (JWT + bcrypt + MongoDB) for multi-user support

Every algorithm was chosen deliberately — not because it is the newest or most complex, but because it is the **most appropriate** for the problem: fast enough for real-time use, accurate enough to be trusted, and robust enough to handle real-world variation in lighting, audio quality, and writing style.

---

*EmpathAI — Understanding how people feel, one moment at a time.*
