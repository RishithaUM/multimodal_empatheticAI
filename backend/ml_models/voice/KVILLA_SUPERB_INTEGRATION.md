# Kvilla + SUPERB Fusion Integration Guide

## Overview

The emotion detection system has been upgraded to support the **Kvilla wav2vec2 model** as the primary voice emotion detector, with **SUPERB** as a backup/stabilizer.

**Model Characteristics:**
- **Kvilla**: Fine-tuned on RAVDESS, CREMA-D, and TESS (~85% test accuracy)
- **SUPERB**: Robust model trained on multiple emotion datasets
- **Fusion Strategy**: Intelligent weighted averaging with agreement boosting

## Architecture

```
Audio Input
  ↓
Preprocessing (16kHz, mono, normalization)
  ↓
Chunking (2-3 second segments)
  ↓
Silence Removal
  ↓
┌─────────────────┬──────────────────┐
│   Kvilla Model  │   SUPERB Model   │
│   (Primary)     │   (Backup)       │
│   65% weight    │   35% weight     │
└────────┬────────┴────────┬─────────┘
         │                 │
         └────────┬────────┘
                  ↓
         Fusion (Agreement boost)
                  ↓
         Final Emotion + Confidence
```

## Configuration

### Environment Variables

Set `VOICE_EMOTION_MODEL` to choose which model to use:

```bash
# Use Kvilla + SUPERB (default, recommended)
export VOICE_EMOTION_MODEL=kvilla

# Or use original DualModel (wav2vec2 + SUPERB ER)
export VOICE_EMOTION_MODEL=wav2vec2
```

### In Python

```python
import os
os.environ['VOICE_EMOTION_MODEL'] = 'kvilla'

from ml_models.model_manager import MLModelManager

# Initialize with Kvilla model
manager = MLModelManager(device='cpu')
```

## Usage

### Direct Usage (Kvilla + SUPERB)

```python
from ml_models.voice.voice_emotion_kvilla_superb import KvillaSuperBFusion

# Initialize
detector = KvillaSuperBFusion(device='cpu')  # or 'cuda'

# Detect emotion
result = detector.detect_emotion('path/to/audio.wav')

print(f"Emotion: {result['emotion']}")
print(f"Confidence: {result['confidence']:.2%}")
print(f"All scores: {result['all_scores']}")
```

### Via Model Manager

```python
from ml_models.model_manager import MLModelManager

manager = MLModelManager(device='cpu')
result = manager.detect_voice_emotion('path/to/audio.wav')
```

### Via Flask API

```python
# POST /api/emotion/voice/detect
# With multipart/form-data: audio=<file>

response = {
    'success': True,
    'emotion': 'happy',
    'confidence': 0.92,
    'all_scores': {
        'angry': 0.02,
        'happy': 0.92,
        'sad': 0.03,
        'neutral': 0.02,
        'fear': 0.01,
        'disgust': 0.00,
        'surprised': 0.00
    },
    'model_type': 'kvilla_superb_fusion',
    'audio_features': {...}
}
```

## Output Format

All emotion detection methods return:

```python
{
    'emotion': str,                    # Primary emotion (angry, happy, sad, neutral, fear, disgust, surprise)
    'confidence': float,               # Confidence score 0-1
    'all_scores': dict,               # {emotion: score} for all emotions
    'model': str,                     # 'kvilla_superb_fusion' or 'kvilla' or 'superb'
    'fusion_info': {                  # Only present when using fusion
        'kvilla_emotion': str,
        'kvilla_confidence': float,
        'superb_emotion': str,
        'superb_confidence': float,
        'agreement': bool,
        'kvilla_weight': float,
        'superb_weight': float,
        'chunks_analyzed': int
    },
    'error': str                      # If applicable
}
```

## Supported Audio Formats

- WAV
- MP3
- OGG
- FLAC
- M4A

Max file size: 50MB

## Audio Processing Pipeline

### 1. Normalization
- Target sample rate: 16kHz
- Mono conversion
- Amplitude normalization to [-1, 1] range

### 2. Chunking
- Segment duration: 2.5 seconds
- Minimum segment: 0.5 seconds
- Automatic silence detection and removal (>50% silence = skip)

### 3. Detection
- Run both Kvilla and SUPERB on each chunk
- Aggregate results using weighted averaging

### 4. Fusion
- Kvilla gets 65% weight (primary)
- SUPERB gets 35% weight (backup)
- If Kvilla confidence < 45%, increase SUPERB weight to 55%
- Agreement boost: +15% if both models agree

## Performance

### Speed
- Load time: ~5-10 seconds (first time)
- Inference: ~200-500ms per chunk
- Full audio (3 min): ~5-10 seconds

### Accuracy
- Kvilla test accuracy: ~85% (trained on RAVDESS, CREMA-D, TESS)
- Fusion accuracy: Typically higher than individual models
- Best performance: 4-10 second audio samples

## Emotions Detected

1. **Angry** 😠 - Aggressive, irritated
2. **Happy** 😊 - Joyful, excited
3. **Sad** 😢 - Sorrowful, depressed
4. **Neutral** 😐 - Calm, expressionless
5. **Fear** 😨 - Frightened, anxious
6. **Disgust** 🤢 - Repulsed, contemptuous
7. **Surprise** 😮 - Astonished, shocked

## Testing

Run the test suite:

```bash
cd backend
python ../test_kvilla_superb.py
```

Expected output:
```
TEST 1: Model Loading ✅
TEST 2: Audio Processing ✅
TEST 3: Sample Audio Detection ✅
TEST 4: Model Manager Integration ✅
```

## Fallback Behavior

If Kvilla model fails to load:
1. System logs a warning
2. Automatically falls back to original DualModel (wav2vec2 + SUPERB ER)
3. API behavior unchanged (same endpoints, same format)

## GPU Acceleration

To enable GPU (CUDA):

```python
from ml_models.voice.voice_emotion_kvilla_superb import KvillaSuperBFusion

# Automatically detects GPU
detector = KvillaSuperBFusion(device='cuda')
```

Or check availability:

```python
import torch
device = 'cuda' if torch.cuda.is_available() else 'cpu'
detector = KvillaSuperBFusion(device=device)
```

## Troubleshooting

### Model Download Issues
If models fail to download during initialization:
1. Check internet connection
2. Models are auto-downloaded from Hugging Face on first run
3. Check available disk space (~2-3GB needed)

### High Memory Usage
Each model requires ~1-2GB:
- Kvilla: ~1.2GB
- SUPERB: ~1.1GB
- Total: ~2-2.5GB

To reduce memory:
- Use smaller batch sizes
- Enable GPU for faster processing
- Process audio in smaller chunks

### Slow Inference
Normal speeds:
- CPU: 200-500ms per chunk
- GPU: 50-100ms per chunk

If slower:
1. Check CPU/GPU utilization
2. Reduce audio chunk size (min 0.5s)
3. Verify no other heavy processes running

## Advanced Configuration

### Custom Emotion Mapping

The SUPERB model provides arousal/dominance/valence dimensions. These are automatically mapped to basic emotions:

```python
from ml_models.voice.voice_emotion_kvilla_superb import SUPERBEmotionDetector

# Get raw dimensions:
result = detector.detect(audio)
dimensions = result['dimensions']
# {
#     'arousal': 0.75,      # 0=calm, 1=excited
#     'dominance': 0.55,    # 0=submissive, 1=dominant
#     'valence': 0.82       # 0=negative, 1=positive
# }
```

### Model Weights Adjustment

Edit `KvillaSuperBFusion` class:

```python
# Default weights
KVILLA_WEIGHT = 0.65
SUPERB_WEIGHT = 0.35
CONFIDENCE_THRESHOLD = 0.45

# Change to:
KVILLA_WEIGHT = 0.70  # Trust Kvilla more
SUPERB_WEIGHT = 0.30
```

## References

- **Kvilla Model**: https://huggingface.co/kvilla/wav2vec2-english-speech-emotion-recognition-finetuned
- **SUPERB Dataset**: https://superb.cs.ntu.edu.tw/
- **wav2vec2 Paper**: https://arxiv.org/abs/2006.11477

## Support

For issues or questions:
1. Check the test suite output
2. Review logs in Flask console
3. Verify audio file format and sample rate
4. Test with different audio samples
