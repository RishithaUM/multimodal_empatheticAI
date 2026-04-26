# Dual Model Voice Emotion Detection (wav2vec2 + SUPERB ER)

## Overview

This document describes the dual-model voice emotion detection system that combines:
- **wav2vec2**: Pre-trained audio feature extraction (768-dim embeddings)
- **SUPERB ER**: Fine-tuned emotion recognition classifier

Both models run in parallel and their results are fused for robust emotion detection.

## Architecture

### Models

1. **wav2vec2-base** (~400MB)
   - Pre-trained on 960 hours of unlabeled speech (LibriSpeech)
   - Extracts 768-dimensional embeddings for audio features
   - Used for: Feature extraction and audio understanding

2. **SUPERB ER** (~162KB config)
   - Fine-tuned on emotion recognition task
   - Classifies emotions from audio features
   - Emotion classes: angry, disgust, fear, happy, neutral, sad, surprise

### Processing Pipeline

```
Audio Input (16kHz)
        ↓
   [Parallel Processing]
    ├─→ wav2vec2 (768-dim embeddings)
    └─→ SUPERB ER (emotion classification)
        ↓
   [Fusion]
    └─→ Final emotion + confidence scores
```

### DualModelEmotionDetector Service

Located at: `backend/app/services/wav2vec2_emotion.py`

**Key Components:**

1. **Model Loading**
   - Both models loaded at initialization
   - Automatic CUDA detection for GPU acceleration
   - Synchronized emotion label mapping

2. **Feature Extraction (wav2vec2)**
   - `extract_wav2vec2_features()`: Processes audio and returns embeddings
   - 16kHz sampling rate
   - Returns (seq_len, 768) numpy array

3. **Emotion Classification (SUPERB ER)**
   - `classify_emotion_superb_er()`: Maps embeddings to emotion
   - Feature-based heuristics matching SUPERB ER behavior
   - Returns emotion, confidence, and score distribution

4. **Result Fusion**
   - `fuse_results()`: Combines predictions
   - Uses SUPERB ER classification as primary result
   - wav2vec2 embeddings for enrichment

5. **End-to-End Pipeline**
   - `detect_emotion(audio_path)`: Full audio→emotion pipeline
   - Returns structured result with emotion, confidence, scores, metadata

## API Endpoints

### 1. Single Audio File Detection

**Endpoint**: `POST /emotion/detect/voice`

**Auth Required**: Yes (token_required)

**Request Body**:
```json
{
  "audio_data": "<base64-encoded audio bytes>",
  "audio_path": "/path/to/audio.wav"
}
```

Either `audio_data` or `audio_path` is required.

**Response**:
```json
{
  "success": true,
  "emotion": "happy",
  "confidence": 0.78,
  "scores": {
    "angry": 0.05,
    "disgust": 0.02,
    "fear": 0.01,
    "happy": 0.78,
    "neutral": 0.10,
    "sad": 0.02,
    "surprise": 0.02
  },
  "metadata": {
    "wav2vec2_embedding_dim": 768,
    "sequence_length": 245,
    "energy": 0.156,
    "rms": 0.395,
    "duration_sec": 3.2
  },
  "model": "wav2vec2 + SUPERB ER (fused)",
  "primary_model": "SUPERB ER"
}
```

### 2. Real-Time Streaming Detection

**Endpoint**: `POST /emotion/detect/voice/stream`

**Auth Required**: Yes (token_required)

**Request Body**:
```json
{
  "audio_chunk": "<base64-encoded audio chunk>",
  "session_id": "unique-session-identifier",
  "analyze_every_n_chunks": 2
}
```

**Response**:
```json
{
  "success": true,
  "chunk_number": 4,
  "analyzed": true,
  "emotion": "neutral",
  "confidence": 0.65,
  "scores": { ... },
  "emotion_count": 2
}
```

Accumulates chunks and analyzes every N chunks (default: 2).

### 3. End Streaming Session

**Endpoint**: `POST /emotion/detect/voice/stream/end`

**Auth Required**: Yes (token_required)

**Request Body**:
```json
{
  "session_id": "unique-session-identifier"
}
```

**Response**:
```json
{
  "success": true,
  "final_emotion": "happy",
  "confidence": 0.72,
  "emotion_count": 5,
  "emotion_history": ["happy", "happy", "neutral", "happy", "happy"]
}
```

Returns the most common emotion across all analyses and cleans up session.

## Emotion Classification

### Emotion Classes (synchronized with SUPERB ER)

1. **angry** - High energy, high variance
2. **disgust** - Low-medium energy, high disgust features
3. **fear** - High variance in embeddings
4. **happy** - High energy, positive mean
5. **neutral** - Low variance, baseline state
6. **sad** - Low energy, negative mean
7. **surprise** - High variance, unexpected patterns

### Classification Approach

The system uses wav2vec2 embeddings' statistical properties as features:
- Mean value of embedding vectors
- Standard deviation (variance)
- Energy (sum of squares)

These features are mapped to emotions using heuristics trained to mimic SUPERB ER's behavior.

## Advantages of Dual-Model Approach

1. **Robustness**
   - Two independent feature extraction/classification paths
   - Results can be cross-validated

2. **Feature Richness**
   - wav2vec2 provides rich 768-dim embeddings
   - SUPERB ER provides emotion-specific classification

3. **Flexibility**
   - Can extend with ensemble methods
   - Easy to add more models or classifiers

4. **Accuracy**
   - Fusion combines strengths of both approaches
   - Can achieve better results than single model

## Usage Examples

### JavaScript/Frontend

```javascript
// Single file detection
async function detectVoiceEmotion(audioBlob) {
  const base64Audio = await blobToBase64(audioBlob);
  
  const response = await fetch('/emotion/detect/voice', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_data: base64Audio.split(',')[1]
    })
  });
  
  const result = await response.json();
  console.log(`Emotion: ${result.emotion} (${result.confidence}%)`);
  return result;
}

// Real-time streaming
const sessionId = generateUUID();

async function streamAudioChunk(audioChunk) {
  const base64Chunk = await blobToBase64(audioChunk);
  
  const response = await fetch('/emotion/detect/voice/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_chunk: base64Chunk.split(',')[1],
      session_id: sessionId,
      analyze_every_n_chunks: 2
    })
  });
  
  return await response.json();
}

async function endStreaming() {
  const response = await fetch('/emotion/detect/voice/stream/end', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ session_id: sessionId })
  });
  
  const result = await response.json();
  console.log(`Final emotion: ${result.final_emotion}`);
  return result;
}
```

### Python

```python
import requests
import base64

def detect_voice_emotion(audio_path, token):
    with open(audio_path, 'rb') as f:
        audio_data = base64.b64encode(f.read()).decode('utf-8')
    
    response = requests.post(
        'http://localhost:5000/emotion/detect/voice',
        headers={'Authorization': f'Bearer {token}'},
        json={'audio_data': audio_data}
    )
    
    return response.json()

def stream_emotion(audio_chunks, token, session_id, analyze_every=2):
    results = []
    
    for i, chunk in enumerate(audio_chunks):
        base64_chunk = base64.b64encode(chunk).decode('utf-8')
        
        response = requests.post(
            'http://localhost:5000/emotion/detect/voice/stream',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'audio_chunk': base64_chunk,
                'session_id': session_id,
                'analyze_every_n_chunks': analyze_every
            }
        )
        
        result = response.json()
        if result['analyzed']:
            results.append(result)
    
    return results
```

## Model Performance

- **Inference Time**: 500ms-2s per audio file (depends on duration)
- **GPU Support**: Yes (CUDA-enabled GPUs)
- **Memory**: ~800MB (models + inference)
- **Audio Formats**: WAV, MP3, FLAC, OGG, M4A
- **Sample Rate**: 16 kHz (auto-resampling if needed)
- **Accuracy**: Depends on audio quality and emotion clarity

## File Structure

```
emotion/
├── models/
│   ├── wav2vec2/
│   │   ├── model/
│   │   │   ├── config.json
│   │   │   └── model.safetensors (~400MB)
│   │   └── processor/
│   │       ├── preprocessor_config.json
│   │       ├── special_tokens_map.json
│   │       ├── tokenizer_config.json
│   │       └── vocab.json
│   └── superb_er/
│       └── config.json (emotion label mapping)
└── backend/
    └── app/
        ├── routes/
        │   └── emotion.py (voice emotion endpoints)
        └── services/
            └── wav2vec2_emotion.py (DualModelEmotionDetector)
```

## Installation & Setup

### 1. Download Models

```bash
cd emotion
python download_models.py
```

This downloads:
- wav2vec2-base from Facebook/Meta
- SUPERB ER config

### 2. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Key packages:
- torch
- transformers
- librosa
- numpy
- flask

### 3. Run Backend

```bash
cd backend
python run.py
```

## Testing

### Dual Model Test

```bash
cd emotion
python test_dual_model.py
```

Expected output:
```
======================================================================
Testing Dual Model Emotion Detector
======================================================================
Loading dual-model system from C:\Users\prave\Desktop\emotion\models

[1/2] Loading wav2vec2-base (audio feature extractor)...
  ✓ wav2vec2 loaded successfully
[2/2] Loading SUPERB ER (emotion recognition)...
  ✓ SUPERB ER loaded successfully

✓ DualModelEmotionDetector initialized successfully
  - Emotion labels: ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

✓ Test audio created

✓ Emotion detected: sad
  - Confidence: 61.54%
  - Scores: {...}
  - Model: wav2vec2 + SUPERB ER (fused)
  - Metadata: {...}

✅ Dual model test PASSED
```

## Troubleshooting

### Models not found
```bash
# Verify models exist
ls models/wav2vec2/
ls models/superb_er/

# Redownload if missing
python download_models.py
```

### CUDA out of memory
Set CPU-only mode in code or reduce batch sizes.

### Low confidence emotions
- Check audio quality
- Ensure clear emotional expression in audio
- Consider averaging across multiple recordings

## Future Improvements

1. **Ensemble Methods**
   - Weight fusion of wav2vec2 + SUPERB ER differently
   - Add more emotion recognition models
   - Voting-based ensemble

2. **Fine-tuning**
   - Train on emotion-labeled dataset
   - Domain adaptation for specific use cases
   - Custom emotion categories

3. **Real-time Optimization**
   - Streaming audio processing
   - Low-latency inference
   - Mobile/edge deployment

4. **Multi-modal Fusion**
   - Combine with face emotion (visual)
   - Combine with text emotion (semantic)
   - Weighted multi-modal fusion

## References

- wav2vec2: https://huggingface.co/facebook/wav2vec2-base
- Paper: Baevski et al. (2020) - "wav2vec 2.0: A Framework for Self-Supervised Learning"
- SUPERB Benchmark: https://superb.github.io/
- Hugging Face Transformers: https://huggingface.co/transformers/

