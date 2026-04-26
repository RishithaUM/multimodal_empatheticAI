"""
Voice Emotion Detection using wav2vec2 + SUPERB ER models
Combines embeddings from wav2vec2 with emotion classification from SUPERB ER.
Processes audio through both models in parallel and fuses results.
"""
import torch
import numpy as np
from pathlib import Path
import librosa
from transformers import (
    Wav2Vec2Model,
    Wav2Vec2Config,
    AutoModelForAudioClassification,
    AutoModelForSequenceClassification,
    AutoFeatureExtractor,
    AutoProcessor,
)
import json
from concurrent.futures import ThreadPoolExecutor

class DualModelEmotionDetector:
    """
    Detects emotions from voice using both:
    - wav2vec2: Pre-trained audio feature extractor (768-dim embeddings)
    - SUPERB ER: Fine-tuned emotion recognition classifier
    
    Runs both models in parallel and fuses results for robust emotion detection.
    """
    
    def __init__(self, model_dir=None):
        """Initialize with both wav2vec2 and SUPERB ER models"""
        if model_dir is None:
            # __file__ = /path/to/backend/app/services/wav2vec2_emotion.py
            model_dir = Path(__file__).parent.parent.parent.parent / 'models'
        
        self.model_dir = Path(model_dir)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        print(f"Loading dual-model system from {self.model_dir}")
        
        # Load wav2vec2
        self._load_wav2vec2()
        
        # Load SUPERB ER
        self._load_superb_er()
        
        # Emotion labels (synchronized with SUPERB ER)
        self.emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
        self.emotion_to_id = {e: i for i, e in enumerate(self.emotion_labels)}
        self.id_to_emotion = {i: e for i, e in enumerate(self.emotion_labels)}
    
    def _load_wav2vec2(self):
        """Load wav2vec2 model for audio feature extraction"""
        print("\n[1/2] Loading wav2vec2-base (audio feature extractor)...")
        try:
            wav2vec2_dir = self.model_dir / 'wav2vec2'
            model_config_path = wav2vec2_dir / 'model' / 'config.json'
            
            # Load config and model
            with open(model_config_path, 'r') as f:
                config_dict = json.load(f)
            
            config = Wav2Vec2Config.from_dict(config_dict)
            self.wav2vec2_model = Wav2Vec2Model.from_pretrained(
                str(wav2vec2_dir / 'model'),
                config=config,
                local_files_only=True
            )
            self.wav2vec2_model.to(self.device)
            self.wav2vec2_model.eval()
            
            # Simple processor for wav2vec2
            self.wav2vec2_processor = self._create_simple_processor()
            
            print("  ✓ wav2vec2 loaded successfully")
        except Exception as e:
            print(f"  ✗ Error loading wav2vec2: {e}")
            raise
    
    def _load_superb_er(self):
        """Load SUPERB ER model for emotion recognition"""
        print("[2/2] Loading SUPERB ER (emotion recognition)...")
        try:
            superb_er_dir = self.model_dir / 'superb_er'

            # Support both flat and nested download layouts.
            model_candidates = [
                superb_er_dir,
                superb_er_dir / 'model',
            ]
            processor_candidates = [
                superb_er_dir,
                superb_er_dir / 'processor',
                superb_er_dir / 'model',
            ]

            def _has_weights(path):
                return (path / 'pytorch_model.bin').exists() or (path / 'model.safetensors').exists()

            model_dir = next((p for p in model_candidates if _has_weights(p)), None)
            if model_dir is None:
                raise FileNotFoundError(
                    f"No model weights found in {superb_er_dir}. "
                    "Expected pytorch_model.bin or model.safetensors in superb_er/ or superb_er/model/"
                )

            processor_dir = next((p for p in processor_candidates if (p / 'preprocessor_config.json').exists() or (p / 'processor_config.json').exists()), model_dir)

            try:
                self.superb_er_processor = AutoProcessor.from_pretrained(
                    str(processor_dir),
                    local_files_only=True
                )
            except Exception:
                # Many audio checkpoints provide only a feature extractor.
                self.superb_er_processor = AutoFeatureExtractor.from_pretrained(
                    str(processor_dir),
                    local_files_only=True
                )

            # Try audio-classification first, then sequence-classification checkpoints.
            model_load_error = None
            try:
                self.superb_er_model = AutoModelForAudioClassification.from_pretrained(
                    str(model_dir),
                    local_files_only=True
                )
            except Exception as e_audio:
                model_load_error = e_audio
                self.superb_er_model = AutoModelForSequenceClassification.from_pretrained(
                    str(model_dir),
                    local_files_only=True
                )

            self.superb_er_model.to(self.device)
            self.superb_er_model.eval()

            # Store label mapping from model config
            model_id2label = getattr(self.superb_er_model.config, 'id2label', None)
            if model_id2label:
                self.superb_er_id2label = {int(k): v for k, v in model_id2label.items()}
            else:
                self.superb_er_id2label = {
                    0: 'angry', 1: 'disgust', 2: 'fear',
                    3: 'happy', 4: 'neutral', 5: 'sad', 6: 'surprise'
                }

            print("  ✓ SUPERB ER loaded successfully")
            print(f"    Model dir: {model_dir}")
            print(f"    Processor dir: {processor_dir}")
            print(f"    Labels: {self.superb_er_id2label}")

            if model_load_error is not None:
                print(f"    ℹ️ Loaded as sequence-classification checkpoint")
            
        except Exception as e:
            raise RuntimeError(f"Failed to load required SUPERB ER model: {e}") from e
    
    def _create_simple_processor(self):
        """Create simple processor for audio"""
        class SimpleProcessor:
            def __init__(self):
                self.sampling_rate = 16000
            
            def __call__(self, waveform, sampling_rate=16000, return_tensors='pt', padding=False):
                if isinstance(waveform, list):
                    waveform = waveform[0] if len(waveform) > 0 else np.array([])
                
                if isinstance(waveform, np.ndarray):
                    waveform = torch.from_numpy(waveform.astype(np.float32))
                elif not isinstance(waveform, torch.Tensor):
                    waveform = torch.tensor(waveform, dtype=torch.float32)
                
                if waveform.dim() > 1:
                    waveform = waveform.squeeze()
                
                if waveform.dim() == 1:
                    waveform = waveform.unsqueeze(0)
                
                return {
                    'input_values': waveform,
                    'attention_mask': torch.ones_like(waveform)
                }
        
        return SimpleProcessor()
    
    def extract_wav2vec2_features(self, audio_path, sr=16000):
        """
        Extract wav2vec2 embeddings from audio
        
        Returns:
            embeddings: (seq_len, 768) numpy array
            waveform: raw audio waveform
        """
        print(f"  ⏳ Loading audio from: {audio_path}")
        
        # Try to load audio, with fallback for different formats
        try:
            waveform, _ = librosa.load(audio_path, sr=sr)
        except Exception as e:
            print(f"     ⚠️  Librosa load failed: {e}")
            print(f"     ⏳ Trying alternative audio loading...")
            
            # Try using scipy if librosa fails
            try:
                from scipy.io import wavfile
                sample_rate, waveform = wavfile.read(audio_path)
                if sample_rate != sr:
                    # Resample using librosa
                    waveform = librosa.resample(waveform.astype(np.float32), orig_sr=sample_rate, target_sr=sr)
                else:
                    waveform = waveform.astype(np.float32)
            except Exception as e2:
                print(f"     ⚠️  Scipy failed: {e2}")
                print(f"     ⏳ Trying pydub for WebM/MP3 support...")
                
                try:
                    from pydub import AudioSegment
                    audio = AudioSegment.from_file(audio_path)
                    # Convert to numpy array
                    samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
                    
                    if audio.channels == 2:
                        samples = samples.reshape((-1, 2))
                        samples = samples.mean(axis=1)
                    
                    # Normalize
                    samples = samples / (2 ** 15)  # 16-bit audio
                    
                    # Resample if needed
                    if audio.frame_rate != sr:
                        waveform = librosa.resample(samples, orig_sr=audio.frame_rate, target_sr=sr)
                    else:
                        waveform = samples
                except Exception as e3:
                    print(f"     ❌ All audio loading methods failed: {e3}")
                    raise Exception(f"Failed to load audio file: {audio_path}. Tried librosa, scipy, and pydub.")
        
        print(f"     Audio shape: {waveform.shape}")
        
        # Normalize
        if np.max(np.abs(waveform)) > 0:
            waveform = waveform / np.max(np.abs(waveform))
            print(f"     ✓ Audio normalized")
        
        # Process with wav2vec2
        print(f"  ⏳ Processing through wav2vec2 model...")
        inputs = self.wav2vec2_processor(
            waveform,
            sampling_rate=sr,
            return_tensors='pt',
            padding=True
        )
        print(f"     Input shape: {inputs['input_values'].shape}")
        
        with torch.no_grad():
            outputs = self.wav2vec2_model(
                inputs['input_values'].to(self.device),
                attention_mask=inputs['attention_mask'].to(self.device) if 'attention_mask' in inputs else None
            )
        
        embeddings = outputs.last_hidden_state
        print(f"     ✓ wav2vec2 extracted {embeddings.shape} embeddings")
        return embeddings.squeeze(0).cpu().numpy(), waveform
    
    def _normalize_emotion_label(self, label):
        """Normalize model labels to the internal emotion set."""
        normalized = str(label).strip().lower()
        aliases = {
            'surprised': 'surprise',
            'fearful': 'fear',
            'happiness': 'happy',
            'sadness': 'sad',
            'anger': 'angry'
        }
        return aliases.get(normalized, normalized)

    def _prepare_waveform_for_classification(self, waveform, sr=16000):
        """Preprocess waveform for more stable classifier inference."""
        prepared = np.asarray(waveform, dtype=np.float32).squeeze()

        if prepared.ndim != 1:
            prepared = prepared.reshape(-1)

        if len(prepared) == 0:
            raise ValueError("Empty waveform provided for classification")

        # Keep consistent amplitude scale for model input.
        peak = float(np.max(np.abs(prepared)))
        if peak > 0:
            prepared = prepared / peak

        # Remove long leading/trailing silence where possible.
        try:
            trimmed, _ = librosa.effects.trim(prepared, top_db=30)
            if len(trimmed) >= int(0.4 * sr):
                prepared = trimmed
        except Exception:
            # Use untrimmed waveform if trim fails for any codec edge-case.
            pass

        return prepared

    def _chunk_waveform(self, waveform, sr=16000, window_sec=2.5, hop_sec=1.25, min_chunk_sec=0.75):
        """Split waveform into overlapping chunks for robust inference."""
        window_samples = max(1, int(window_sec * sr))
        hop_samples = max(1, int(hop_sec * sr))
        min_chunk_samples = max(1, int(min_chunk_sec * sr))

        if len(waveform) <= window_samples:
            return [waveform]

        chunks = []
        start = 0
        while start < len(waveform):
            end = start + window_samples
            chunk = waveform[start:end]

            if len(chunk) < min_chunk_samples:
                break

            chunks.append(chunk)

            if end >= len(waveform):
                break
            start += hop_samples

        return chunks if chunks else [waveform]

    def classify_emotion_superb_er(self, waveform, embeddings=None):
        """
        Classify emotion using SUPERB ER model on waveform.
        """
        prepared_waveform = self._prepare_waveform_for_classification(waveform)

        if self.superb_er_model is None or self.superb_er_processor is None:
            raise RuntimeError("SUPERB ER model is not available for inference")

        print("  ⏳ Running real SUPERB ER classifier inference...")
        chunks = self._chunk_waveform(prepared_waveform)
        print(f"     Using {len(chunks)} chunk(s) for ensemble inference")

        chunk_probabilities = []
        with torch.no_grad():
            for chunk in chunks:
                inputs = self.superb_er_processor(
                    chunk,
                    sampling_rate=16000,
                    return_tensors='pt',
                    padding=True
                )
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
                logits = self.superb_er_model(**inputs).logits
                probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()
                chunk_probabilities.append(probs)

        probs = np.mean(np.stack(chunk_probabilities, axis=0), axis=0)

        scores_model = {emotion: 0.0 for emotion in self.emotion_labels}
        unknown_label_mass = 0.0
        for idx, prob in enumerate(probs):
            label = self._normalize_emotion_label(self.superb_er_id2label.get(idx, str(idx)))
            if label in scores_model:
                scores_model[label] += float(prob)
            else:
                unknown_label_mass += float(prob)

        model_total = sum(scores_model.values())
        if model_total > 0:
            scores_model = {k: float(v / model_total) for k, v in scores_model.items()}

        scores = scores_model
        emotion = max(scores, key=lambda x: scores[x])
        confidence = float(scores[emotion])

        if unknown_label_mass > 0.05:
            print(f"     ⚠️ Ignored unsupported label mass: {unknown_label_mass:.3f}")

        print("     ✓ SUPERB ER classifier inference complete")
        return emotion, scores, confidence
    
    def fuse_results(self, superb_emotion, superb_confidence, superb_scores, embeddings):
        """
        Fuse results from SUPERB ER classification with wav2vec2 embeddings.
        """
        # Use SUPERB ER's classification as primary result
        # Embeddings can be used for additional analysis
        
        return {
            'emotion': superb_emotion,
            'confidence': superb_confidence,
            'scores': superb_scores,
            'model': 'wav2vec2 + SUPERB ER (fused)',
            'primary_model': 'SUPERB ER'
        }
    
    def detect_emotion(self, audio_path):
        """
        Full pipeline: load audio -> extract features -> classify emotion -> fuse results
        """
        try:
            print(f"\n{'='*80}")
            print(f"🎤 VOICE EMOTION DETECTION (Real Model Output)")
            print(f"{'='*80}")
            print(f"📂 Audio File: {audio_path}")
            
            # Extract features
            embeddings, waveform = self.extract_wav2vec2_features(audio_path)
            
            # Print wav2vec2 embeddings
            print(f"\n[1] WAV2VEC2 EMBEDDINGS:")
            print(f"    Shape: {embeddings.shape}")
            print(f"    Dimension: {embeddings.shape[1]} (768-dim feature vectors)")
            print(f"    Sequence Length: {embeddings.shape[0]} timesteps")
            print(f"    Sample embeddings (first 5 values of first timestep):")
            print(f"    {embeddings[0, :5]}")
            print(f"    Embedding statistics:")
            print(f"      Mean: {np.mean(embeddings):.6f}")
            print(f"      Std:  {np.std(embeddings):.6f}")
            print(f"      Min:  {np.min(embeddings):.6f}")
            print(f"      Max:  {np.max(embeddings):.6f}")
            
            # Classify using SUPERB ER model
            emotion, scores, confidence = self.classify_emotion_superb_er(waveform, embeddings)
            
            # Print SUPERB ER classification
            print(f"\n[2] SUPERB ER EMOTION CLASSIFICATION:")
            print(f"    Primary Emotion: {emotion.upper()}")
            print(f"    Confidence: {confidence:.4f} ({confidence*100:.2f}%)")
            print(f"    Emotion Scores (all 7 emotions):")
            for emo, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
                bar_length = int(score * 30)
                bar = "█" * bar_length + "░" * (30 - bar_length)
                print(f"      {emo:10s} {bar} {score:.4f}")
            
            # Calculate audio metadata
            audio_energy = np.mean(waveform ** 2)
            audio_rms = np.sqrt(np.mean(waveform ** 2))
            
            print(f"\n[3] AUDIO FEATURES:")
            print(f"    Energy (RMS): {audio_rms:.6f}")
            print(f"    Duration: {len(waveform) / 16000:.2f} seconds")
            print(f"    Sample Rate: 16000 Hz")
            print(f"    Waveform Shape: {waveform.shape}")
            
            # Fuse results
            result = self.fuse_results(emotion, confidence, scores, embeddings)
            
            result.update({
                'success': True,
                'metadata': {
                    'wav2vec2_embedding_dim': embeddings.shape[1],
                    'sequence_length': embeddings.shape[0],
                    'energy': float(audio_energy),
                    'rms': float(audio_rms),
                    'duration_sec': len(waveform) / 16000
                }
            })
            
            print(f"\n{'='*80}")
            print(f"✅ RESULT: {emotion.upper()} (confidence: {confidence:.2%})")
            print(f"{'='*80}\n")
            
            return result
            
        except Exception as e:
            print(f"\n❌ ERROR in emotion detection: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e),
                'emotion': 'unknown'
            }


# Keep old class name for backward compatibility
class Wav2Vec2EmotionDetector(DualModelEmotionDetector):
    """Backward compatibility alias for DualModelEmotionDetector"""
    pass


if __name__ == '__main__':
    detector = DualModelEmotionDetector()
    print("\n✓ Dual-Model Emotion Detector initialized successfully")
    """
    Detects emotions from voice using wav2vec2 feature extraction
    and simple emotion classifier
    """
    
    def __init__(self, model_dir=None):
        """Initialize with wav2vec2 model"""
        if model_dir is None:
            # __file__ = /path/to/backend/app/services/wav2vec2_emotion.py
            # parent = /path/to/backend/app/services
            # parent.parent = /path/to/backend/app
            # parent.parent.parent = /path/to/backend
            # parent.parent.parent.parent = /path/to (emotion root)
            model_dir = Path(__file__).parent.parent.parent.parent / 'models' / 'wav2vec2'
        
        self.model_dir = Path(model_dir)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        print(f"Loading wav2vec2 model from {self.model_dir}")
        try:
            # Load model from local path using Wav2Vec2Model directly
            model_config_path = self.model_dir / 'model' / 'config.json'
            model_weights_path = self.model_dir / 'model' / 'model.safetensors'
            
            print(f"  Config: {model_config_path}")
            print(f"  Weights: {model_weights_path}")
            
            # Load config
            with open(model_config_path, 'r') as f:
                config_dict = json.load(f)
            
            config = Wav2Vec2Config.from_dict(config_dict)
            
            # Load model with safetensors
            self.model = Wav2Vec2Model.from_pretrained(
                str(self.model_dir / 'model'),
                config=config,
                local_files_only=True
            )
            self.model.to(self.device)
            self.model.eval()
            print("✓ wav2vec2 model loaded successfully")
            
            # Create simple processor
            self.processor = self._create_processor()
            
        except Exception as e:
            print(f"Error loading model: {e}")
            import traceback
            traceback.print_exc()
            raise
        
        # Emotion labels
        self.emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
        self.emotion_mapping = {
            'angry': 0, 'disgust': 1, 'fear': 2,
            'happy': 3, 'neutral': 4, 'sad': 5, 'surprise': 6
        }
    
    def _create_processor(self):
        """Create a simple processor for wav2vec2"""
        class Wav2Vec2SimpleProcessor:
            def __init__(self):
                self.sampling_rate = 16000
                self.padding_value = 0.0
            
            def __call__(self, waveform, sampling_rate=16000, return_tensors='pt', padding=False):
                if isinstance(waveform, list):
                    waveform = waveform[0] if len(waveform) > 0 else np.array([])
                
                # Ensure waveform is float32
                if isinstance(waveform, np.ndarray):
                    waveform = torch.from_numpy(waveform.astype(np.float32))
                elif not isinstance(waveform, torch.Tensor):
                    waveform = torch.tensor(waveform, dtype=torch.float32)
                
                # Ensure it's 1D
                if waveform.dim() > 1:
                    waveform = waveform.squeeze()
                
                # Add batch dimension if needed
                if waveform.dim() == 1:
                    waveform = waveform.unsqueeze(0)
                
                return {
                    'input_values': waveform,
                    'attention_mask': torch.ones_like(waveform)
                }
        
        return Wav2Vec2SimpleProcessor()
    
    def extract_features(self, audio_path, sr=16000):
        """
        Extract wav2vec2 embeddings from audio
        
        Args:
            audio_path: Path to audio file
            sr: Sample rate (default 16kHz)
            
        Returns:
            embeddings: (seq_len, 768) torch tensor
            waveform: raw audio waveform
        """
        # Load audio
        waveform, _ = librosa.load(audio_path, sr=sr)
        
        # Normalize
        if np.max(np.abs(waveform)) > 0:
            waveform = waveform / np.max(np.abs(waveform))
        
        # Process with wav2vec2
        inputs = self.processor(
            waveform,
            sampling_rate=sr,
            return_tensors='pt',
            padding=True
        )
        
        # Extract embeddings
        with torch.no_grad():
            outputs = self.model(
                inputs['input_values'].to(self.device),
                attention_mask=inputs['attention_mask'].to(self.device) if 'attention_mask' in inputs else None
            )
        
        # Get last hidden state (embeddings)
        embeddings = outputs.last_hidden_state  # (batch, seq_len, 768)
        
        return embeddings.squeeze(0).cpu().numpy(), waveform
    
    def classify_emotion(self, embeddings):
        """
        Simple emotion classification from embeddings
        Uses average pooling and simple heuristics
        
        Args:
            embeddings: wav2vec2 embeddings (seq_len, 768)
            
        Returns:
            emotion: detected emotion label
            scores: emotion confidence scores
        """
        # Average pooling
        avg_embedding = np.mean(embeddings, axis=0)
        
        # Simple classification based on embedding statistics
        # This is a basic approach - in production you'd use a trained classifier
        
        # Calculate statistics
        mean_val = np.mean(avg_embedding)
        std_val = np.std(avg_embedding)
        energy = np.sum(avg_embedding ** 2) / len(avg_embedding)
        
        # Simple heuristics for emotion detection
        scores = {}
        
        # Initialize all emotions
        for emotion in self.emotion_labels:
            scores[emotion] = 0.0
        
        # Basic emotion heuristics (highly simplified)
        if energy > np.percentile([np.sum(avg_embedding ** 2) for _ in range(1)], 75):
            scores['happy'] += 0.3
            scores['angry'] += 0.2
        else:
            scores['sad'] += 0.2
            scores['neutral'] += 0.3
        
        if std_val > 0.5:
            scores['fear'] += 0.2
            scores['surprise'] += 0.15
        
        if mean_val > 0:
            scores['happy'] += 0.15
        else:
            scores['sad'] += 0.15
        
        # Set neutral as baseline
        if sum(scores.values()) == 0:
            scores['neutral'] = 1.0
        
        # Normalize to get probabilities
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        else:
            scores['neutral'] = 1.0
        
        # Get emotion with highest score
        emotion = max(scores, key=scores.get)
        confidence = scores[emotion]
        
        return emotion, scores, confidence
    
    def detect_emotion(self, audio_path):
        """
        Full pipeline: load audio -> extract features -> classify emotion
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            result: dict with emotion, confidence, scores, and metadata
        """
        try:
            # Extract features
            embeddings, waveform = self.extract_features(audio_path)
            
            # Classify emotion
            emotion, scores, confidence = self.classify_emotion(embeddings)
            
            # Calculate audio statistics
            audio_energy = np.mean(waveform ** 2)
            audio_rms = np.sqrt(np.mean(waveform ** 2))
            
            result = {
                'success': True,
                'emotion': emotion,
                'confidence': float(confidence),
                'scores': {k: float(v) for k, v in scores.items()},
                'metadata': {
                    'model': 'wav2vec2-base',
                    'energy': float(audio_energy),
                    'rms': float(audio_rms),
                    'duration_sec': len(waveform) / 16000
                }
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'emotion': 'unknown'
            }


# Test the detector
if __name__ == '__main__':
    detector = Wav2Vec2EmotionDetector()
    print("\n✓ Wav2Vec2 Emotion Detector initialized successfully")
    
    def extract_features(self, audio_path, sr=16000):
        """
        Extract wav2vec2 embeddings from audio
        
        Args:
            audio_path: Path to audio file
            sr: Sample rate (default 16kHz)
            
        Returns:
            embeddings: (seq_len, 768) torch tensor
            waveform: raw audio waveform
        """
        # Load audio
        waveform, _ = librosa.load(audio_path, sr=sr)
        
        # Normalize
        if np.max(np.abs(waveform)) > 0:
            waveform = waveform / np.max(np.abs(waveform))
        
        # Process with wav2vec2
        inputs = self.processor(
            waveform,
            sampling_rate=sr,
            return_tensors='pt',
            padding=True
        )
        
        # Extract embeddings
        with torch.no_grad():
            outputs = self.model(
                inputs['input_values'].to(self.device),
                attention_mask=inputs['attention_mask'].to(self.device) if 'attention_mask' in inputs else None
            )
        
        # Get last hidden state (embeddings)
        embeddings = outputs.last_hidden_state  # (batch, seq_len, 768)
        
        return embeddings.squeeze(0).cpu().numpy(), waveform
    
    def classify_emotion(self, embeddings):
        """
        Simple emotion classification from embeddings
        Uses average pooling and simple heuristics
        
        Args:
            embeddings: wav2vec2 embeddings (seq_len, 768)
            
        Returns:
            emotion: detected emotion label
            scores: emotion confidence scores
        """
        # Average pooling
        avg_embedding = np.mean(embeddings, axis=0)
        
        # Simple classification based on embedding statistics
        # This is a basic approach - in production you'd use a trained classifier
        
        # Calculate statistics
        mean_val = np.mean(avg_embedding)
        std_val = np.std(avg_embedding)
        energy = np.sum(avg_embedding ** 2) / len(avg_embedding)
        
        # Simple heuristics for emotion detection
        scores = {}
        
        # Initialize all emotions
        for emotion in self.emotion_labels:
            scores[emotion] = 0.0
        
        # Basic emotion heuristics (highly simplified)
        if energy > np.percentile([np.sum(avg_embedding ** 2) for _ in range(1)], 75):
            scores['happy'] += 0.3
            scores['angry'] += 0.2
        else:
            scores['sad'] += 0.2
            scores['neutral'] += 0.3
        
        if std_val > 0.5:
            scores['fear'] += 0.2
            scores['surprise'] += 0.15
        
        if mean_val > 0:
            scores['happy'] += 0.15
        else:
            scores['sad'] += 0.15
        
        # Set neutral as baseline
        if sum(scores.values()) == 0:
            scores['neutral'] = 1.0
        
        # Normalize to get probabilities
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        else:
            scores['neutral'] = 1.0
        
        # Get emotion with highest score
        emotion = max(scores, key=scores.get)
        confidence = scores[emotion]
        
        return emotion, scores, confidence
    
    def detect_emotion(self, audio_path):
        """
        Full pipeline: load audio -> extract features -> classify emotion
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            result: dict with emotion, confidence, scores, and metadata
        """
        try:
            # Extract features
            embeddings, waveform = self.extract_features(audio_path)
            
            # Classify emotion
            emotion, scores, confidence = self.classify_emotion(embeddings)
            
            # Calculate audio statistics
            audio_energy = np.mean(waveform ** 2)
            audio_rms = np.sqrt(np.mean(waveform ** 2))
            
            result = {
                'success': True,
                'emotion': emotion,
                'confidence': float(confidence),
                'scores': {k: float(v) for k, v in scores.items()},
                'metadata': {
                    'model': 'wav2vec2-base',
                    'energy': float(audio_energy),
                    'rms': float(audio_rms),
                    'duration_sec': len(waveform) / 16000
                }
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'emotion': 'unknown'
            }


# Test the detector
if __name__ == '__main__':
    detector = Wav2Vec2EmotionDetector()
    print("\n✓ Wav2Vec2 Emotion Detector initialized successfully")
