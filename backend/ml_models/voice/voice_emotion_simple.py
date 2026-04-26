"""
Voice Emotion Detection - Simple Working Implementation
Uses librosa + sklearn for emotion detection without complex dependencies
"""
import librosa
import numpy as np
from pathlib import Path
import os
import pickle
import logging

logger = logging.getLogger(__name__)


class VoiceEmotionSimple:
    """Simple voice emotion detector using librosa features and classifier"""
    
    EMOTIONS = ['angry', 'happy', 'neutral', 'sad']
    
    def __init__(self, device='cpu'):
        """Initialize voice emotion detector"""
        self.device = device
        self.emotion_labels = self.EMOTIONS
        self.sample_rate = 16000
        logger.info("✅ Voice Emotion Simple Model initialized")
    
    def extract_features(self, audio_path_or_array):
        """Extract audio features for emotion detection"""
        try:
            # Load audio
            if isinstance(audio_path_or_array, str):
                y, sr = librosa.load(audio_path_or_array, sr=self.sample_rate)
            else:
                y = audio_path_or_array
                sr = self.sample_rate
            
            # Ensure audio is not empty
            if len(y) == 0:
                return {'error': 'Audio is empty', 'mfcc_features': None}
            
            features = {}
            
            # MFCC features
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            features['mfcc_mean'] = np.mean(mfcc, axis=1)
            features['mfcc_std'] = np.std(mfcc, axis=1)
            
            # Energy-based features
            S = librosa.feature.melspectrogram(y=y, sr=sr)
            log_S = librosa.power_to_db(S, ref=np.max)
            features['energy_mean'] = np.mean(log_S)
            features['energy_std'] = np.std(log_S)
            
            # RMS energy
            features['rms'] = np.sqrt(np.mean(y**2))
            
            # Zero crossing rate
            zcr = librosa.feature.zero_crossing_rate(y)
            features['zcr_mean'] = np.mean(zcr)
            features['zcr_std'] = np.std(zcr)
            
            # Spectral features
            features['spectral_centroid'] = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
            features['spectral_rolloff'] = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            features['chroma_mean'] = np.mean(chroma, axis=1)
            features['chroma_std'] = np.std(chroma, axis=1)
            
            # Tempogram
            features['onset_strength'] = np.mean(librosa.onset.onset_strength(y=y, sr=sr))
            
            return features
            
        except Exception as e:
            logger.error(f"Feature extraction error: {str(e)}")
            return {'error': str(e), 'mfcc_features': None}
    
    def detect_emotion(self, audio_path_or_array):
        """
        Detect emotion from audio using simple heuristics
        """
        try:
            features = self.extract_features(audio_path_or_array)
            
            if 'error' in features:
                return {
                    'emotion': 'neutral',
                    'confidence': 0.0,
                    'error': features['error']
                }
            
            # Simple emotion classification based on audio features
            # These are based on common voice emotion characteristics
            rms = features.get('rms', 0)
            energy = features.get('energy_mean', 0)
            zcr = features.get('zcr_mean', 0)
            spectral_centroid = features.get('spectral_centroid', 0)
            
            # Normalize features (rough normalization)
            energy_norm = (energy + 80) / 80  # Normalize from -80dB range
            rms_norm = rms * 10  # RMS typically 0-0.1
            zcr_norm = zcr * 100  # ZCR typically 0-0.1
            sc_norm = spectral_centroid / 4000  # Normalize to ~0-1
            
            # Emotion classification logic
            scores = {
                'angry': 0.25,      # Start with baseline
                'happy': 0.25,
                'neutral': 0.25,
                'sad': 0.25
            }
            
            # High RMS and energy = angry or happy
            if rms_norm > 0.5 and energy_norm > 0.5:
                if zcr_norm > 0.3:  # High frequency = happy
                    scores['happy'] += 0.3
                    scores['angry'] += 0.1
                else:  # Low frequency = angry
                    scores['angry'] += 0.3
                    scores['happy'] += 0.1
            
            # Low RMS and energy = sad or neutral
            elif rms_norm < 0.3 and energy_norm < 0.3:
                if sc_norm < 0.4:  # Low spectral centroid = sad
                    scores['sad'] += 0.3
                    scores['neutral'] += 0.1
                else:  # Higher spectral centroid = neutral
                    scores['neutral'] += 0.3
                    scores['sad'] += 0.1
            
            # Moderate values = neutral
            else:
                scores['neutral'] += 0.2
            
            # Normalize scores
            total = sum(scores.values())
            scores = {k: v / total for k, v in scores.items()}
            
            # Get dominant emotion
            emotion = max(scores, key=scores.get)
            confidence = scores[emotion]
            
            return {
                'emotion': emotion,
                'confidence': confidence,
                'all_scores': scores,
                'audio_features': {
                    'rms': float(rms),
                    'energy': float(energy),
                    'zcr': float(features.get('zcr_mean', 0)),
                    'spectral_centroid': float(spectral_centroid)
                },
                'model_type': 'simple_librosa'
            }
        
        except Exception as e:
            logger.error(f"Emotion detection error: {str(e)}")
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': str(e)
            }
