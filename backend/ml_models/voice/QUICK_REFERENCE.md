# Voice Emotion Detection - Quick Reference

## 🚀 Getting Started (2 minutes)

### Step 1: Initialize Kvilla+SUPERB Detector
```python
from ml_models.voice.voice_emotion_kvilla_superb import KvillaSuperBFusion

detector = KvillaSuperBFusion(device='cpu')
```

### Step 2: Detect Emotion
```python
result = detector.detect_emotion('audio.wav')
print(f"Emotion: {result['emotion']}")
print(f"Confidence: {result['confidence']:.2%}")
```

### Step 3: Use with MLModelManager
```python
from ml_models.model_manager import MLModelManager

manager = MLModelManager(device='cpu')
result = manager.detect_voice_emotion('audio.wav')
```

---

## 🎯 Emotion Classes (7 emotions)

```
📊 Emotion Classification:
├─ angry      (Anger, aggression)
├─ disgust    (Dislike, revulsion)
├─ fear       (Fear, anxiety)
├─ happy      (Joy, happiness)
├─ neutral    (Neutral, flat)
├─ sad        (Sadness, despair)
└─ surprise   (Shock, surprise)
```

---

## 📁 File Structure

```
backend/ml_models/voice/
├─ voice_emotion_kvilla_superb.py        # 🎯 Primary: Kvilla + SUPERB fusion
├─ voice_emotion_enhanced.py             # 🔧 Enhanced feature extractor
├─ voice_emotion_simple.py              # ⚠️ Simple librosa fallback
├─ VOICE_EMOTION_SETUP_GUIDE.md         # 📖 Full guide
├─ KVILLA_SUPERB_INTEGRATION.md         # 📖 Integration guide
├─ QUICK_REFERENCE.md                   # ⚡ This file
└─ __init__.py
```

---

## ✅ Model Architecture

**Kvilla + SUPERB Fusion System**:
- **Kvilla** (Primary, 65% weight): Fine-tuned wav2vec2 on TESS, RAVDESS, CREMA-D (~85% accuracy)
- **SUPERB ER** (Backup, 35% weight): Robust multi-dataset emotion model
- Agreement boost: confidence raised when both models agree

Inference time: 50–200ms per audio chunk

---

## 🔌 Integration Examples

### With Flask
```python
from flask import Blueprint, request, jsonify
from ml_models.model_manager import MLModelManager

bp = Blueprint('voice', __name__)
manager = MLModelManager()

@bp.route('/api/emotion/voice', methods=['POST'])
def analyze_voice():
    audio_file = request.files['audio']
    audio_file.save('temp.wav')
    result = manager.detect_voice_emotion('temp.wav')
    return jsonify(result)
```

### With Model Manager
```python
from ml_models.model_manager import MLModelManager

manager = MLModelManager()

# Single modality
voice_emotion = manager.detect_voice_emotion('audio.wav')

# Multimodal fusion
fused = manager.fuse_emotions(
    face_result=face_data,
    voice_result=voice_emotion,
    text_result=text_data
)
```

### Direct Usage
```python
from ml_models.voice.voice_emotion_kvilla_superb import KvillaSuperBFusion

detector = KvillaSuperBFusion(device='cpu')
result = detector.detect_emotion('audio.wav')

# Output
# {
#   'emotion': 'happy',
#   'confidence': 0.95,
#   'all_scores': {'angry': 0.02, 'happy': 0.95, ...},
#   'model_type': 'kvilla_superb_fusion'
# }
```


---

## ⚙️ Configuration

### GPU Acceleration
```python
detector = DualModelEmotionDetector()  # Automatically uses CUDA if available
```

---

## 📊 Performance Metrics

| Model | Speed | Accuracy | Memory |
|-------|-------|----------|--------|
| Kvilla + SUPERB ER Fusion | 50-200ms | ~85% | ~2GB |

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Model not found" | Ensure models/ directory exists with wav2vec2 and superb_er folders |
| "Audio processing error" | Check: Audio duration > 1s, format supported (wav, mp3) |
| "Out of memory" | Use lighter GPU or CPU mode |

---

## ✨ Key Features

✅ **Kvilla + SUPERB Fusion** - Kvilla (65%) + SUPERB ER (35%) for best accuracy
✅ **7 Emotion Classes** - Comprehensive emotion detection
✅ **Multimodal Support** - Fuse with face & text emotion
✅ **GPU Optimized** - CUDA support for real-time processing
✅ **Production Ready** - Error handling & logging included
✅ **Easy Integration** - Works with existing Flask routes

---

## 🔗 Related Files

- Main detector: [voice_emotion_kvilla_superb.py](voice_emotion_kvilla_superb.py)
- Model manager: [../model_manager.py](../model_manager.py)
- Integration guide: [KVILLA_SUPERB_INTEGRATION.md](KVILLA_SUPERB_INTEGRATION.md)
# List available models
python download_pretrained_voice_model.py list

# Download specific model
python download_pretrained_voice_model.py download speech-emotion-recognition-english

# Download all models
python download_pretrained_voice_model.py download-all

# Run tests
python test_voice_emotion.py
```

---

**Last Updated:** April 24, 2026
**Framework:** Hugging Face Transformers + PyTorch
**Status:** ✅ Production Ready
