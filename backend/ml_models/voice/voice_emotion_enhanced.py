"""
Enhanced Voice Emotion Detection with Hugging Face Pretrained Models

Uses pretrained Hugging Face models for audio emotion recognition
"""
import torch
import librosa
import numpy as np
import os
import json
import logging
import warnings
from pathlib import Path
from typing import Dict, Union

logger = logging.getLogger(__name__)

# Suppress warnings
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=UserWarning)

# Try to import Hugging Face transformers for pretrained models
try:
    from transformers import AutoProcessor, AutoModelForAudioClassification, pipeline
    HAS_HF = True
except ImportError:
    HAS_HF = False


class VoiceEmotionHuggingFace:
    """Voice emotion detection using Hugging Face pretrained models"""
    
    def __init__(self, model_path: str = None, device: str = 'cpu'):
        """
        Initialize with Hugging Face pretrained model
        
        Args:
            model_path: Path to downloaded pretrained model directory
            device: 'cpu' or 'cuda'
        """
        if not HAS_HF:
            raise ImportError("Transformers library required. Install with: pip install transformers")
        
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.model_path = model_path
        self.processor = None
        self.model = None
        self.metadata = None
        self.emotion_labels = []
        
        if model_path:
            self._load_pretrained_model(model_path)
        else:
            logger.debug("No model path provided. Use: python download_pretrained_voice_model.py download")
    
    def _load_pretrained_model(self, model_path: str):
        """Load pretrained model from local path"""
        model_path = Path(model_path)
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model path not found: {model_path}")
        
        try:
            # Load metadata
            metadata_file = model_path / 'metadata.json'
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    self.metadata = json.load(f)
                self.emotion_labels = self.metadata.get('emotions', [])
                print(f"✅ Loaded metadata: {self.metadata['description']}")
            
            # Load processor
            processor_path = model_path / 'processor'
            if processor_path.exists():
                self.processor = AutoProcessor.from_pretrained(str(processor_path))
                print("✅ Loaded processor")
            
            # Load model
            model_weights_path = model_path / 'model'
            if model_weights_path.exists():
                self.model = AutoModelForAudioClassification.from_pretrained(str(model_weights_path))
                self.model = self.model.to(self.device)
                self.model.eval()
                print("✅ Loaded model weights")
            
            if self.model is None:
                raise RuntimeError("Failed to load model")
                
        except Exception as e:
            raise RuntimeError(f"Error loading pretrained model: {str(e)}")
    
    def detect_emotion(self, audio_path_or_array: Union[str, np.ndarray]) -> Dict:
        """
        Detect emotion from audio using pretrained model
        
        Args:
            audio_path_or_array: Path to audio file or numpy array
        
        Returns:
            Dictionary with emotion, confidence, and scores
        """
        if self.model is None or self.processor is None:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': 'Model not loaded'
            }
        
        try:
            # Load audio
            if isinstance(audio_path_or_array, str):
                audio, sr = librosa.load(audio_path_or_array, sr=16000)
            else:
                audio = audio_path_or_array
                sr = 16000
            
            # Process audio
            inputs = self.processor(
                audio, 
                sampling_rate=sr, 
                return_tensors="pt",
                padding=True
            ).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.nn.functional.softmax(logits, dim=-1)
                confidence, predicted = torch.max(probabilities, dim=-1)
            
            emotion_idx = predicted.item()
            emotion = self.emotion_labels[emotion_idx] if emotion_idx < len(self.emotion_labels) else 'neutral'
            confidence = confidence.item()
            
            # Get all emotion scores
            all_scores = {}
            for i, label in enumerate(self.emotion_labels):
                all_scores[label] = float(probabilities[0, i].item())
            
            return {
                'emotion': emotion,
                'confidence': confidence,
                'all_scores': all_scores,
                'model_type': 'huggingface_pretrained'
            }
            
        except Exception as e:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': str(e),
                'model_type': 'huggingface_pretrained'
            }
