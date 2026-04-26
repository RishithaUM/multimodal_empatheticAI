"""
Unified ML Model Manager
Coordinates all emotion detection models
"""
from ml_models.face.face_emotion_cnn import FaceEmotionCNN
from ml_models.text.text_emotion_transformer import TextEmotionTransformer
from app.services.wav2vec2_emotion import DualModelEmotionDetector
import os
import warnings
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Suppress warnings during model loading
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

# Configuration for voice emotion detection model
VOICE_EMOTION_MODEL = os.getenv('VOICE_EMOTION_MODEL', 'kvilla').lower()  # 'kvilla' or 'wav2vec2'


class MLModelManager:
    """Unified manager for all ML models"""
    
    def __init__(self, device='cpu'):
        """Initialize all models"""
        self.device = device
        self.face_model = None
        self.voice_model = None
        self.text_model = None
        self._load_models()
    
    def _load_models(self):
        """Load all models with error handling"""
        logger.info("=" * 70)
        logger.info("LOADING ML MODELS")
        logger.info("=" * 70)
        
        try:
            logger.info("Loading Face Emotion CNN...")
            self.face_model = FaceEmotionCNN(device=self.device)
            logger.info("✅ Face model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load face model: {str(e)}")
        
        # Load voice emotion detection
        self._load_voice_model()
        
        try:
            logger.info("Loading Text Emotion (Ollama)...")
            self.text_model = TextEmotionTransformer(device=self.device)
            logger.info("✅ Text model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load text model: {str(e)}")
        
        logger.info("=" * 70)
    
    def _load_voice_model(self):
        """Load voice emotion model (Kvilla + SUPERB or fallback to wav2vec2)"""
        # Try Kvilla + SUPERB first if configured or available
        if VOICE_EMOTION_MODEL == 'kvilla':
            try:
                logger.info("Attempting to load Kvilla + SUPERB Fusion model...")
                from ml_models.voice.voice_emotion_kvilla_superb import VoiceEmotionBiLSTM
                
                # Auto-detect local Kvilla model
                kvilla_path = None
                possible_paths = [
                    Path(__file__).parent.parent.parent / 'models' / 'Kvilla',
                    Path(__file__).parent.parent.parent / 'models' / 'kvilla',
                ]
                
                for path in possible_paths:
                    if path.exists() and (path / 'config.json').exists():
                        kvilla_path = str(path)
                        logger.info(f"Found local Kvilla model: {kvilla_path}")
                        break
                
                self.voice_model = VoiceEmotionBiLSTM(device=self.device, kvilla_path=kvilla_path)
                
                if self.voice_model.fusion.kvilla.is_loaded:
                    logger.info("✅ Kvilla + SUPERB Fusion model loaded successfully (source: {})".format(
                        self.voice_model.fusion.kvilla.model_source
                    ))
                else:
                    logger.warning("⚠️  Kvilla model not loaded, using SUPERB only")
                
                return
            except Exception as e:
                logger.warning(f"⚠️  Failed to load Kvilla model: {str(e)}")
                logger.info("Falling back to DualModel (wav2vec2 + SUPERB ER)...")
        else:
            logger.info("Using DualModel (wav2vec2 + SUPERB ER) as configured...")
        
        # Fallback to original implementation
        try:
            self.voice_model = DualModelEmotionDetector()
            logger.info("✅ Voice model loaded successfully (DualModel - wav2vec2 + SUPERB ER)")
        except Exception as e:
            logger.error(f"❌ Failed to load voice model: {str(e)}")

    
    def detect_face_emotion(self, image_input):
        """Detect emotion from face"""
        if self.face_model is None:
            return {'error': 'Face model not loaded'}
        return self.face_model.detect_emotion(image_input)
    
    def detect_voice_emotion(self, audio_input):
        """Detect emotion from voice"""
        if self.voice_model is None:
            return {'error': 'Voice model not loaded'}
        return self.voice_model.detect_emotion(audio_input)
    
    def detect_text_emotion(self, text_input):
        """Detect emotion from text"""
        if self.text_model is None:
            return {'error': 'Text model not loaded'}
        return self.text_model.detect_emotion(text_input)
    
    def fuse_emotions(self, face_result=None, voice_result=None, text_result=None, weights=None):
        """Fuse results from all models"""
        if weights is None:
            weights = {
                'face': 0.4,
                'voice': 0.3,
                'text': 0.3
            }
        
        # Collect available results
        results = {}
        confidences = []
        emotions = []
        
        if face_result and 'emotion' in face_result:
            results['face'] = face_result
            confidences.append(face_result.get('confidence', 0) * weights['face'])
            emotions.append(face_result['emotion'])
        
        if voice_result and 'emotion' in voice_result:
            results['voice'] = voice_result
            confidences.append(voice_result.get('confidence', 0) * weights['voice'])
            emotions.append(voice_result['emotion'])
        
        if text_result and 'emotion' in text_result:
            results['text'] = text_result
            confidences.append(text_result.get('confidence', 0) * weights['text'])
            emotions.append(text_result['emotion'])
        
        # Calculate fused emotion
        fused_confidence = sum(confidences) if confidences else 0
        dominant_emotion = max(emotions, key=emotions.count) if emotions else 'neutral'
        
        return {
            'fused_emotion': dominant_emotion,
            'fused_confidence': min(1.0, fused_confidence),
            'individual_results': results,
            'fusion_weights': weights
        }


# Global model manager instance
_model_manager = None


def get_model_manager(device='cpu'):
    """Get or create global model manager instance"""
    global _model_manager
    if _model_manager is None:
        _model_manager = MLModelManager(device=device)
    return _model_manager


def initialize_models(device='cpu'):
    """Initialize global models"""
    global _model_manager
    _model_manager = MLModelManager(device=device)
    return _model_manager
