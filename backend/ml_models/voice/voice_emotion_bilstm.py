"""
Voice Emotion Detection Model (BiLSTM)
Uses audio features and BiLSTM for temporal emotion recognition
"""
import torch
import torch.nn as nn
import librosa
import numpy as np
import os


class VoiceEmotionBiLSTM:
    """Voice emotion detection using BiLSTM"""
    
    EMOTIONS = ['angry', 'happy', 'neutral', 'sad']
    
    def __init__(self, model_path=None, device='cpu'):
        """Initialize voice emotion model"""
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.emotion_labels = self.EMOTIONS
        self.sample_rate = 16000
        self.n_mfcc = 13
        self.n_fft = 2048
        self.hop_length = 512
        
        self.model = self._load_model(model_path)
    
    def _load_model(self, model_path):
        """Load or create BiLSTM model"""
        if model_path and os.path.exists(model_path):
            model = torch.load(model_path, map_location=self.device)
        else:
            model = BiLSTMEmotionModel(
                input_size=self.n_mfcc,
                hidden_size=128,
                num_layers=2,
                num_classes=len(self.EMOTIONS)
            )
        
        model = model.to(self.device)
        model.eval()
        return model
    
    def extract_features(self, audio_path_or_array):
        """Extract audio features"""
        try:
            # Load audio
            if isinstance(audio_path_or_array, str):
                y, sr = librosa.load(audio_path_or_array, sr=self.sample_rate)
            else:
                y = audio_path_or_array
                sr = self.sample_rate
            
            # Extract MFCC features
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=self.n_mfcc)
            
            # Extract delta (first derivative)
            mfcc_delta = librosa.feature.delta(mfcc)
            
            # Extract delta-delta (second derivative)
            mfcc_delta_delta = librosa.feature.delta(mfcc, order=2)
            
            # Concatenate features
            features = np.vstack([mfcc, mfcc_delta, mfcc_delta_delta])
            
            # Transpose to (timesteps, features)
            features = features.T
            
            # Extract other features
            energy = np.sqrt(np.mean(y**2))
            
            # Zero crossing rate
            zcr = librosa.feature.zero_crossing_rate(y).mean()
            
            # Spectral centroid
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr).mean()
            
            return {
                'mfcc_features': features,
                'energy': energy,
                'zcr': zcr,
                'spectral_centroid': spectral_centroid
            }
        except Exception as e:
            return {
                'error': str(e),
                'mfcc_features': None
            }
    
    def detect_emotion(self, audio_path_or_array):
        """
        Detect emotion from audio
        Returns emotion and confidence
        """
        try:
            features_dict = self.extract_features(audio_path_or_array)
            
            if 'error' in features_dict:
                return {
                    'emotion': 'neutral',
                    'confidence': 0.0,
                    'error': features_dict['error']
                }
            
            features = features_dict['mfcc_features']
            
            # Pad or truncate to fixed length
            max_length = 500
            if features.shape[0] < max_length:
                pad_width = ((0, max_length - features.shape[0]), (0, 0))
                features = np.pad(features, pad_width, mode='constant')
            else:
                features = features[:max_length]
            
            # Convert to tensor
            features_tensor = torch.FloatTensor(features).unsqueeze(0).to(self.device)
            
            # Inference
            with torch.no_grad():
                logits = self.model(features_tensor)
                probabilities = torch.nn.functional.softmax(logits, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
            
            emotion_idx = predicted.item()
            emotion = self.emotion_labels[emotion_idx]
            confidence = confidence.item()
            
            # Get all emotion scores
            all_scores = {
                self.emotion_labels[i]: float(probabilities[0, i].item())
                for i in range(len(self.emotion_labels))
            }
            
            return {
                'emotion': emotion,
                'confidence': confidence,
                'all_scores': all_scores,
                'audio_features': {
                    'energy': float(features_dict['energy']),
                    'zcr': float(features_dict['zcr']),
                    'spectral_centroid': float(features_dict['spectral_centroid'])
                }
            }
        except Exception as e:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': str(e)
            }


class BiLSTMEmotionModel(nn.Module):
    """BiLSTM model for emotion classification"""
    
    def __init__(self, input_size, hidden_size, num_layers, num_classes, dropout=0.2):
        super(BiLSTMEmotionModel, self).__init__()
        
        self.bidirectional_lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout
        )
        
        # Attention layer
        self.attention = nn.Linear(hidden_size * 2, 1)
        
        # Classification head
        self.fc1 = nn.Linear(hidden_size * 2, 256)
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(256, num_classes)
        self.relu = nn.ReLU()
    
    def forward(self, x):
        """Forward pass"""
        # LSTM output
        lstm_out, _ = self.bidirectional_lstm(x)
        
        # Attention weights
        attention_weights = torch.softmax(
            self.attention(lstm_out), dim=1
        )
        
        # Weighted output
        weighted_output = (lstm_out * attention_weights).sum(dim=1)
        
        # Classification
        hidden = self.fc1(weighted_output)
        hidden = self.relu(hidden)
        hidden = self.dropout(hidden)
        logits = self.fc2(hidden)
        
        return logits
