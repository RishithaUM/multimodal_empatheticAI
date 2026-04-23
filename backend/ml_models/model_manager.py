"""
Unified ML Model Manager
Coordinates all emotion detection models
"""
from ml_models.face.face_emotion_cnn import FaceEmotionCNN
from ml_models.voice.voice_emotion_bilstm import VoiceEmotionBiLSTM
from ml_models.text.text_emotion_transformer import TextEmotionTransformer


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
        try:
            print("Loading Face Emotion CNN...")
            self.face_model = FaceEmotionCNN(device=self.device)
            print("✓ Face model loaded")
        except Exception as e:
            print(f"✗ Failed to load face model: {str(e)}")
        
        try:
            print("Loading Voice Emotion BiLSTM...")
            self.voice_model = VoiceEmotionBiLSTM(device=self.device)
            print("✓ Voice model loaded")
        except Exception as e:
            print(f"✗ Failed to load voice model: {str(e)}")
        
        try:
            print("Loading Text Emotion Transformer...")
            self.text_model = TextEmotionTransformer(device=self.device)
            print("✓ Text model loaded")
        except Exception as e:
            print(f"✗ Failed to load text model: {str(e)}")
    
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
