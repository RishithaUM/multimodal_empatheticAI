"""
Voice Emotion Detection using Kvilla + SUPERB Dual Model Fusion

Primary: kvilla wav2vec2 (fine-tuned on RAVDESS, CREMA-D, TESS)
Backup/Stabilizer: SUPERB model

Architecture:
1. Audio preprocessing (16kHz, mono, normalization)
2. Chunk audio (2-3 sec segments)
3. Remove silence chunks
4. Run kvilla + SUPERB in parallel
5. Fusion with weighted averaging
6. Return final emotion with confidence
"""

import torch
import torch.nn as nn
import librosa
import numpy as np
import logging
import warnings
from typing import Dict, Union, Tuple, List, Optional
from pathlib import Path
import scipy.signal as signal

logger = logging.getLogger(__name__)
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=UserWarning)

try:
    from transformers import (
        AutoProcessor,
        AutoModelForAudioClassification,
        AutoFeatureExtractor,
        pipeline,
        Wav2Vec2Processor,
        AutoConfig,
        Wav2Vec2Model,
        Wav2Vec2PreTrainedModel,
    )
    from transformers.modeling_outputs import SequenceClassifierOutput
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False


class AudioProcessor:
    """Audio preprocessing and chunking utilities"""
    
    TARGET_SR = 16000
    CHUNK_DURATION = 2.5  # seconds
    SILENCE_THRESHOLD = 0.02  # amplitude threshold for silence detection
    MIN_CHUNK_DURATION = 0.5  # minimum chunk duration in seconds
    
    @staticmethod
    def load_and_normalize(audio_path: str) -> Tuple[np.ndarray, int]:
        """
        Load audio file and normalize to 16kHz mono
        
        Args:
            audio_path: Path to audio file
        
        Returns:
            Tuple of (audio_array, sample_rate)
        """
        try:
            # Load audio at target sample rate
            audio, sr = librosa.load(audio_path, sr=AudioProcessor.TARGET_SR, mono=True)
            
            # Normalize amplitude
            audio = audio / (np.max(np.abs(audio)) + 1e-8)
            
            # Normalize to [-1, 1] range
            audio = np.clip(audio, -1.0, 1.0)
            
            return audio, int(sr)
        except Exception as e:
            logger.error(f"Error loading audio: {e}")
            raise
    
    @staticmethod
    def detect_silence_chunks(audio: np.ndarray, sr: int) -> List[Tuple[int, int]]:
        """
        Detect chunks of silence in audio
        
        Returns:
            List of (start_sample, end_sample) tuples for silence regions
        """
        # Calculate RMS energy
        frame_length = int(0.02 * sr)  # 20ms frames
        hop_length = frame_length // 2
        
        S = librosa.feature.melspectrogram(y=audio, sr=sr, n_fft=512, hop_length=hop_length)
        S_db = librosa.power_to_db(S, ref=np.max)
        energy = np.mean(S_db, axis=0)
        
        # Threshold to find silence
        threshold = np.mean(energy) - 20  # -20dB below mean
        silent = energy < threshold
        
        # Find continuous silence regions
        silence_chunks = []
        in_silence = False
        silence_start = 0
        
        for i, is_silent in enumerate(silent):
            if is_silent and not in_silence:
                silence_start = i * hop_length
                in_silence = True
            elif not is_silent and in_silence:
                silence_end = i * hop_length
                silence_chunks.append((silence_start, silence_end))
                in_silence = False
        
        if in_silence:
            silence_chunks.append((silence_start, len(audio)))
        
        return silence_chunks
    
    @staticmethod
    def chunk_audio(audio: np.ndarray, sr: int) -> List[np.ndarray]:
        """
        Chunk audio into segments, removing silence
        
        Args:
            audio: Audio array
            sr: Sample rate
        
        Returns:
            List of audio chunks
        """
        chunk_samples = int(AudioProcessor.CHUNK_DURATION * sr)
        min_chunk_samples = int(AudioProcessor.MIN_CHUNK_DURATION * sr)
        silence_chunks = AudioProcessor.detect_silence_chunks(audio, sr)
        
        chunks = []
        pos = 0
        
        while pos < len(audio):
            chunk_end = min(pos + chunk_samples, len(audio))
            chunk = audio[pos:chunk_end]
            
            # Check if chunk overlaps with silence (remove >50% silence)
            silence_overlap = 0
            for sil_start, sil_end in silence_chunks:
                overlap_start = max(pos, sil_start)
                overlap_end = min(chunk_end, sil_end)
                if overlap_start < overlap_end:
                    silence_overlap += overlap_end - overlap_start
            
            if len(chunk) >= min_chunk_samples and silence_overlap < len(chunk) * 0.5:
                chunks.append(chunk)
            
            pos = chunk_end
        
        # If no valid chunks, return whole audio
        if not chunks:
            chunks = [audio]
        
        return chunks


class SpeechClassificationHead(nn.Module):
    """Classification head used by the original Kvilla checkpoint."""

    def __init__(self, config):
        super().__init__()
        # This checkpoint stores classifier.dense/out_proj with hidden_size width.
        proj_size = int(getattr(config, 'hidden_size', 1024))
        final_dropout = float(getattr(config, 'final_dropout', 0.0))

        self.dropout = nn.Dropout(final_dropout)
        self.dense = nn.Linear(config.hidden_size, proj_size)
        self.out_proj = nn.Linear(proj_size, config.num_labels)

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        x = self.dropout(features)
        x = self.dense(x)
        x = torch.tanh(x)
        x = self.dropout(x)
        return self.out_proj(x)


class Wav2Vec2ForSpeechClassification(Wav2Vec2PreTrainedModel):
    """Compatibility model for checkpoints trained with classifier.dense/out_proj."""

    def __init__(self, config):
        if not getattr(config, 'num_labels', None):
            config.num_labels = len(getattr(config, 'id2label', {}) or {}) or 7
        super().__init__(config)
        self.wav2vec2 = Wav2Vec2Model(config)
        self.classifier = SpeechClassificationHead(config)
        self.post_init()

    def _pool_hidden_states(self, hidden_states: torch.Tensor, attention_mask: torch.Tensor | None = None) -> torch.Tensor:
        pooling_mode = str(getattr(self.config, 'pooling_mode', 'mean')).lower()
        if attention_mask is None:
            if pooling_mode == 'sum':
                return hidden_states.sum(dim=1)
            if pooling_mode == 'max':
                return hidden_states.max(dim=1).values
            return hidden_states.mean(dim=1)

        expanded_mask = attention_mask.unsqueeze(-1).type_as(hidden_states)
        masked_hidden = hidden_states * expanded_mask

        if pooling_mode == 'sum':
            return masked_hidden.sum(dim=1)
        if pooling_mode == 'max':
            masked_hidden = masked_hidden.masked_fill(expanded_mask == 0, float('-inf'))
            return masked_hidden.max(dim=1).values

        lengths = expanded_mask.sum(dim=1).clamp(min=1e-9)
        return masked_hidden.sum(dim=1) / lengths

    def forward(
        self,
        input_values,
        attention_mask=None,
        output_attentions=None,
        output_hidden_states=None,
        return_dict=None,
        labels=None,
    ):
        return_dict = return_dict if return_dict is not None else self.config.use_return_dict

        outputs = self.wav2vec2(
            input_values,
            attention_mask=attention_mask,
            output_attentions=output_attentions,
            output_hidden_states=output_hidden_states,
            return_dict=return_dict,
        )
        hidden_states = outputs[0]
        pooled = self._pool_hidden_states(hidden_states, attention_mask=attention_mask)
        logits = self.classifier(pooled)

        if not return_dict:
            output = (logits,) + outputs[2:]
            return output

        return SequenceClassifierOutput(
            loss=None,
            logits=logits,
            hidden_states=outputs.hidden_states,
            attentions=outputs.attentions,
        )


class KvillaEmotionDetector:
    """Kvilla wav2vec2 emotion detector (primary model)"""
    
    # HuggingFace model ID (fallback if local not available)
    MODEL_ID = "kvilla/wav2vec-english-speech-emotion-recognition-finetuned"
    
    # Local model path (priority over HuggingFace)
    LOCAL_MODEL_PATH = None  # Will be set from environment or auto-detected
    
    EMOTION_MAP = {
        0: "angry",
        1: "disgusted",
        2: "fearful",
        3: "happy",
        4: "neutral",
        5: "sad",
        6: "surprised"
    }
    
    def __init__(self, device: str = 'cpu', model_path: Optional[str] = None):
        """
        Initialize Kvilla model
        
        Args:
            device: 'cpu' or 'cuda'
            model_path: Optional local path to model directory
        """
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.processor = None
        self.model = None
        self.is_loaded = False
        self.model_source = None
        
        # Try local path first
        if model_path:
            self._load_from_local(model_path)
        elif self.LOCAL_MODEL_PATH:
            self._load_from_local(self.LOCAL_MODEL_PATH)
        else:
            # Auto-detect common local paths
            local_paths = [
                Path(__file__).parent.parent.parent.parent / 'models' / 'Kvilla',
                Path(__file__).parent.parent.parent.parent / 'models' / 'kvilla',
                Path('.') / 'models' / 'Kvilla',
                Path('.') / 'models' / 'kvilla',
            ]
            
            found_local = False
            for path in local_paths:
                if path.exists() and (path / 'config.json').exists():
                    logger.info(f"Found local Kvilla model at {path}")
                    self._load_from_local(str(path))
                    found_local = True
                    break
            
            if not found_local:
                # Fallback to HuggingFace
                logger.info("Local Kvilla model not found, attempting HuggingFace download...")
                self._load_from_huggingface()
    
    def _load_from_local(self, model_path: str):
        """Load Kvilla model from local path"""
        try:
            local_path = Path(model_path)
            
            if not local_path.exists():
                raise FileNotFoundError(f"Model path not found: {model_path}")
            
            logger.info(f"Loading Kvilla model from local: {local_path}")

            config = AutoConfig.from_pretrained(str(local_path), local_files_only=True)
            if not getattr(config, 'num_labels', None):
                config.num_labels = len(getattr(config, 'id2label', {}) or {}) or 7
            
            # Load processor
            try:
                self.processor = AutoProcessor.from_pretrained(str(local_path), local_files_only=True)
                logger.info("✅ Processor loaded from local")
            except Exception as e:
                logger.debug(f"Could not load local processor: {e}")
                self.processor = AutoFeatureExtractor.from_pretrained('facebook/wav2vec2-base-960h')
                logger.info("✅ Using fallback feature extractor: facebook/wav2vec2-base-960h")
            
            # Load model - try safetensors first, then pytorch
            try:
                self.model = AutoModelForAudioClassification.from_pretrained(
                    str(local_path),
                    local_files_only=True,
                    ignore_mismatched_sizes=True,
                )
                logger.info("✅ Model loaded from local (safetensors/pytorch)")
            except Exception as e:
                logger.debug(f"Could not load with auto: {e}, trying compatible speech-classification loader...")
                self.model = Wav2Vec2ForSpeechClassification(config)
                
                # Try loading state dict from various formats
                weights_loaded = False
                
                # Try pytorch_model.bin first
                weights_path = local_path / 'pytorch_model.bin'
                if weights_path.exists():
                    state_dict = torch.load(weights_path, map_location='cpu')
                    self.model.load_state_dict(state_dict, strict=False)
                    logger.info("✅ Model loaded (pytorch_model.bin)")
                    weights_loaded = True
                
                # Try model.safetensors
                if not weights_loaded:
                    weights_path = local_path / 'model.safetensors'
                    if weights_path.exists():
                        try:
                            from safetensors.torch import load_file
                            state_dict = load_file(str(weights_path))
                            self.model.load_state_dict(state_dict, strict=False)
                            logger.info("✅ Model loaded (model.safetensors)")
                            weights_loaded = True
                        except ImportError:
                            logger.warning("safetensors not available, skipping...")
                
                # Try model_finetuned.pth (custom trained model)
                if not weights_loaded:
                    weights_path = local_path / 'model_finetuned.pth'
                    if weights_path.exists():
                        state_dict = torch.load(weights_path, map_location='cpu')
                        if isinstance(state_dict, dict) and 'state_dict' in state_dict:
                            state_dict = state_dict['state_dict']
                        self.model.load_state_dict(state_dict, strict=False)
                        logger.info("✅ Model loaded (model_finetuned.pth)")
                        weights_loaded = True
                
                if not weights_loaded:
                    raise RuntimeError("No compatible weight file found")
            
            if self.model is None:
                raise RuntimeError("Failed to load model weights")
            
            self.model = self.model.to(self.device)  # type: ignore[arg-type]
            self.model.eval()
            self.is_loaded = True
            self.model_source = 'local'
            logger.info(f"✅ Kvilla loaded successfully from local ({local_path.name})")
            
        except Exception as e:
            logger.error(f"Error loading Kvilla from local: {e}")
            logger.info("Falling back to HuggingFace...")
            self._load_from_huggingface()
    
    def _load_from_huggingface(self):
        """Load Kvilla model from HuggingFace"""
        try:
            logger.info(f"Loading Kvilla model from HuggingFace: {self.MODEL_ID}")
            # Use base feature extractor as robust fallback for this checkpoint family.
            self.processor = AutoFeatureExtractor.from_pretrained('facebook/wav2vec2-base-960h')
            try:
                self.model = AutoModelForAudioClassification.from_pretrained(
                    self.MODEL_ID,
                    ignore_mismatched_sizes=True,
                )
            except Exception:
                config = AutoConfig.from_pretrained(self.MODEL_ID)
                if not getattr(config, 'num_labels', None):
                    config.num_labels = len(getattr(config, 'id2label', {}) or {}) or 7
                self.model = Wav2Vec2ForSpeechClassification.from_pretrained(self.MODEL_ID, config=config)
            self.model = self.model.to(self.device)  # type: ignore[arg-type]
            self.model.eval()
            self.is_loaded = True
            self.model_source = 'huggingface'
            logger.info("✅ Kvilla model loaded from HuggingFace successfully")
        except Exception as e:
            logger.error(f"Error loading Kvilla from HuggingFace: {e}")
            self.is_loaded = False
            self.model_source = 'failed'
    
    def detect(self, audio: np.ndarray, sr: int = 16000) -> Optional[Dict]:
        """
        Detect emotion from audio chunk

        Args:
            audio: Audio array
            sr: Sample rate

        Returns:
            Dict with emotion, confidence, and all scores
        """
        if not self.is_loaded or self.model is None or self.processor is None:
            return None

        try:
            # Resample if necessary
            if sr != 16000:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                sr = 16000
            
            # Process audio
            inputs = self.processor(
                audio,
                sampling_rate=sr,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=int(16000 * 30)  # Max 30 seconds
            ).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits
                probabilities = torch.nn.functional.softmax(logits, dim=-1)
            
            # Get prediction
            pred_idx = int(torch.argmax(probabilities, dim=-1).item())
            confidence = probabilities[0, pred_idx].item()
            
            # Map to emotion label
            emotion = self.EMOTION_MAP.get(pred_idx, "neutral")
            
            # Get all scores
            all_scores = {}
            for idx, label in self.EMOTION_MAP.items():
                all_scores[label] = float(probabilities[0, idx].item())
            
            return {
                'emotion': emotion,
                'confidence': float(confidence),
                'all_scores': all_scores,
                'model': 'kvilla'
            }
        
        except Exception as e:
            logger.error(f"Error in Kvilla detection: {e}")
            return None


class SUPERBEmotionDetector:
    """SUPERB model emotion detector (backup/stabilizer)"""
    
    MODEL_ID = "audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim"
    
    # SUPERB emotion space: arousal, dominance, valence
    # We'll map to basic emotions for compatibility
    
    def __init__(self, device: str = 'cpu'):
        """Initialize SUPERB model"""
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.processor = None
        self.model = None
        self.is_loaded = False
        
        try:
            import transformers as _tf
            _prev_verbosity = _tf.logging.get_verbosity()
            _tf.logging.set_verbosity_error()
            logger.info(f"Loading SUPERB model on {self.device}...")
            self.processor = AutoProcessor.from_pretrained(self.MODEL_ID)
            self.model = AutoModelForAudioClassification.from_pretrained(self.MODEL_ID)
            _tf.logging.set_verbosity(_prev_verbosity)
            self.model = self.model.to(self.device)  # type: ignore[arg-type]
            self.model.eval()
            self.is_loaded = True
            logger.info("✅ SUPERB model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading SUPERB model: {e}")
            self.is_loaded = False
    
    @staticmethod
    def _map_dimensions_to_emotions(arousal: float, dominance: float, valence: float) -> Dict[str, float]:
        """
        Map arousal/dominance/valence to basic emotions
        
        Arousal: low (calm) to high (excited)
        Valence: low (negative) to high (positive)
        Dominance: low (submissive) to high (dominant)
        """
        scores = {
            'angry':     max(0, (arousal + dominance - valence) / 3),
            'happy':     max(0, (arousal + valence - dominance * 0.3) / 2.7),
            'sad':       max(0, (1 - arousal + 1 - valence) / 3),
            'neutral':   max(0, (1 - abs(arousal - 0.5) - abs(valence - 0.5)) / 2),
            'fearful':   max(0, (arousal + 1 - valence + dominance) / 4),
            'surprised': max(0, (arousal + abs(valence - 0.5)) / 2.5),
            'disgusted': max(0, (dominance + 1 - valence - arousal * 0.5) / 2.5),
        }
        
        # Normalize to sum to 1
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        else:
            scores['neutral'] = 1.0
        
        return scores
    
    def detect(self, audio: np.ndarray, sr: int = 16000) -> Optional[Dict]:
        """
        Detect emotion from audio chunk using SUPERB
        
        Args:
            audio: Audio array
            sr: Sample rate
        
        Returns:
            Dict with emotion, confidence, and all scores
        """
        if not self.is_loaded or self.model is None or self.processor is None:
            return None

        try:
            # Resample if necessary
            if sr != 16000:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                sr = 16000
            
            # Process audio
            inputs = self.processor(
                audio,
                sampling_rate=sr,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=int(16000 * 30)
            ).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits  # Shape: (batch, 3) for arousal, dominance, valence
            
            # Normalize to [0, 1]
            predictions = torch.sigmoid(logits)[0].cpu().numpy()
            
            # Extract dimensions
            arousal = float(predictions[0]) if len(predictions) > 0 else 0.5
            dominance = float(predictions[1]) if len(predictions) > 1 else 0.5
            valence = float(predictions[2]) if len(predictions) > 2 else 0.5
            
            # Map to emotions
            all_scores = self._map_dimensions_to_emotions(arousal, dominance, valence)
            
            # Get dominant emotion
            emotion = max(all_scores.items(), key=lambda x: x[1])[0]
            confidence = all_scores[emotion]
            
            return {
                'emotion': emotion,
                'confidence': float(confidence),
                'all_scores': all_scores,
                'model': 'superb',
                'dimensions': {
                    'arousal': float(arousal),
                    'dominance': float(dominance),
                    'valence': float(valence)
                }
            }
        
        except Exception as e:
            logger.error(f"Error in SUPERB detection: {e}")
            return None


class KvillaSuperBFusion:
    """
    Dual model fusion for voice emotion detection
    
    Combines Kvilla (primary) + SUPERB (backup/stabilizer)
    with intelligent fusion logic
    """
    
    # Fusion weights
    KVILLA_WEIGHT = 0.65  # Primary model gets higher weight
    SUPERB_WEIGHT = 0.35  # Stabilizer provides support
    
    # Confidence threshold for considering backup
    CONFIDENCE_THRESHOLD = 0.45
    
    def __init__(self, device: str = 'cpu', kvilla_path: Optional[str] = None):
        """Initialize both models"""
        self.device = device
        self.kvilla = KvillaEmotionDetector(device=device, model_path=kvilla_path)
        self.superb = SUPERBEmotionDetector(device=device)
        self.audio_processor = AudioProcessor()
        
        # Check which models loaded successfully
        self.has_kvilla = self.kvilla.is_loaded
        self.has_superb = self.superb.is_loaded
        
        if not self.has_kvilla and not self.has_superb:
            logger.error("Both Kvilla and SUPERB models failed to load!")
        elif not self.has_kvilla:
            logger.warning("Kvilla model failed to load, using SUPERB only")
        elif not self.has_superb:
            logger.warning("SUPERB model failed to load, using Kvilla only")
        else:
            logger.info("Both Kvilla and SUPERB models loaded successfully")

    @staticmethod
    def _format_scores(scores: Dict[str, float]) -> str:
        """Return a short, readable score summary sorted from high to low."""
        if not scores:
            return "{}"

        items = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        return ", ".join(f"{emotion}={float(score):.4f}" for emotion, score in items)

    def _log_fusion_summary(
        self,
        audio_path: str,
        chunks_count: int,
        avg_kvilla: Optional[Dict],
        avg_superb: Optional[Dict],
        final_result: Dict,
    ) -> None:
        """Print one clean block for the full voice decision path."""
        logger.info("=" * 78)
        logger.info("VOICE EMOTION ANALYSIS SUMMARY")
        logger.info("=" * 78)
        logger.info("Audio file   : %s", audio_path)
        logger.info("Chunks used  : %d", chunks_count)

        if avg_kvilla:
            logger.info(
                "Kvilla       : %s (%.4f)",
                avg_kvilla.get('emotion'),
                float(avg_kvilla.get('confidence', 0.0)),
            )
            logger.info("Kvilla scores: %s", self._format_scores(avg_kvilla.get('all_scores', {})))
        else:
            logger.info("Kvilla       : unavailable")

        if avg_superb:
            logger.info(
                "SUPERB       : %s (%.4f)",
                avg_superb.get('emotion'),
                float(avg_superb.get('confidence', 0.0)),
            )
            logger.info("SUPERB scores : %s", self._format_scores(avg_superb.get('all_scores', {})))
        else:
            logger.info("SUPERB       : unavailable")

        fusion_info = final_result.get('fusion_info', {})
        logger.info("Fusion       : %s", final_result.get('emotion'))
        logger.info("Confidence   : %.4f", float(final_result.get('confidence', 0.0)))
        logger.info("Agreement    : %s", fusion_info.get('agreement'))
        logger.info(
            "Weights      : Kvilla=%.2f | SUPERB=%.2f",
            float(fusion_info.get('kvilla_weight', self.KVILLA_WEIGHT)),
            float(fusion_info.get('superb_weight', self.SUPERB_WEIGHT)),
        )
        logger.info("Final scores : %s", self._format_scores(final_result.get('all_scores', {})))
        logger.info("=" * 78)
    
    def fuse_predictions(self, kvilla_result: Optional[Dict], superb_result: Optional[Dict]) -> Dict:
        """
        Fuse predictions from both models with intelligent weighting
        
        Strategy:
        - If Kvilla confidence > threshold: use weighted average
        - If Kvilla confidence <= threshold: increase SUPERB weight
        - Boost agreement between models
        """
        if kvilla_result is None and superb_result is None:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': 'Both models failed'
            }
        
        if kvilla_result is None:
            return superb_result or {'emotion': 'neutral', 'confidence': 0.0, 'error': 'Both models failed'}
        
        if superb_result is None:
            return kvilla_result

        logger.info(
            "[VOICE][AGGREGATED] Kvilla => emotion=%s confidence=%.4f | SUPERB => emotion=%s confidence=%.4f",
            kvilla_result.get('emotion'),
            float(kvilla_result.get('confidence', 0.0)),
            superb_result.get('emotion'),
            float(superb_result.get('confidence', 0.0)),
        )
        
        # Adjust weights based on confidence
        kvilla_conf = kvilla_result['confidence']
        superb_conf = superb_result['confidence']
        
        if kvilla_conf < self.CONFIDENCE_THRESHOLD:
            # Increase SUPERB weight when Kvilla is uncertain
            kvilla_weight = 0.45
            superb_weight = 0.55
        else:
            kvilla_weight = self.KVILLA_WEIGHT
            superb_weight = self.SUPERB_WEIGHT
        
        # Agreement boost: if both agree, increase confidence
        same_emotion = kvilla_result['emotion'] == superb_result['emotion']
        agreement_boost = 1.15 if same_emotion else 0.95
        
        # Fuse emotion scores
        fused_scores = {}
        
        # Get common emotion labels
        all_emotions = set(kvilla_result['all_scores'].keys()) | set(superb_result['all_scores'].keys())
        
        for emotion in all_emotions:
            kvilla_score = kvilla_result['all_scores'].get(emotion, 0.0)
            superb_score = superb_result['all_scores'].get(emotion, 0.0)
            
            # Weighted fusion
            fused_score = (kvilla_score * kvilla_weight + superb_score * superb_weight)
            
            # Apply agreement boost
            if same_emotion and emotion == kvilla_result['emotion']:
                fused_score *= agreement_boost
            
            fused_scores[emotion] = fused_score
        
        # Normalize scores
        total = sum(fused_scores.values())
        if total > 0:
            fused_scores = {k: v / total for k, v in fused_scores.items()}
        
        # Get final emotion
        final_emotion = max(fused_scores.items(), key=lambda x: x[1])[0]
        final_confidence = fused_scores[final_emotion]

        logger.info(
            "[VOICE][FUSION] final_emotion=%s confidence=%.4f agreement=%s kvilla_weight=%.2f superb_weight=%.2f",
            final_emotion,
            float(final_confidence),
            same_emotion,
            kvilla_weight,
            superb_weight,
        )
        
        return {
            'emotion': final_emotion,
            'confidence': float(final_confidence),
            'all_scores': fused_scores,
            'model': 'kvilla_superb_fusion',
            'fusion_info': {
                'kvilla_emotion': kvilla_result['emotion'],
                'kvilla_confidence': float(kvilla_conf),
                'superb_emotion': superb_result['emotion'],
                'superb_confidence': float(superb_conf),
                'agreement': same_emotion,
                'kvilla_weight': kvilla_weight,
                'superb_weight': superb_weight
            }
        }
    
    def detect_emotion(self, audio_path: str) -> Dict:
        """
        Full pipeline: load audio → chunk → detect → fuse
        
        Args:
            audio_path: Path to audio file
        
        Returns:
            Dict with emotion, confidence, and all scores
        """
        try:
            # Step 1: Load and normalize audio
            logger.info(f"Loading audio: {audio_path}")
            audio, sr = self.audio_processor.load_and_normalize(audio_path)
            
            # Step 2: Chunk audio
            logger.info("Chunking audio...")
            chunks = self.audio_processor.chunk_audio(audio, sr)
            logger.info(f"Created {len(chunks)} chunks")
            
            # Step 3: Run both models on all chunks and aggregate
            kvilla_results = []
            superb_results = []
            
            for i, chunk in enumerate(chunks):
                logger.debug(f"Processing chunk {i+1}/{len(chunks)}")
                
                # Kvilla detection
                kvilla_pred = self.kvilla.detect(chunk, sr)
                if kvilla_pred:
                    kvilla_results.append(kvilla_pred)
                    logger.info(
                        "[VOICE][CHUNK %d/%d][KVILLA] %s (%.4f)",
                        i + 1,
                        len(chunks),
                        kvilla_pred.get('emotion'),
                        float(kvilla_pred.get('confidence', 0.0)),
                    )
                    logger.info("[VOICE][CHUNK %d/%d][KVILLA] scores: %s", i + 1, len(chunks), self._format_scores(kvilla_pred.get('all_scores', {})))
                
                # SUPERB detection
                superb_pred = self.superb.detect(chunk, sr)
                if superb_pred:
                    superb_results.append(superb_pred)
                    logger.info(
                        "[VOICE][CHUNK %d/%d][SUPERB] %s (%.4f)",
                        i + 1,
                        len(chunks),
                        superb_pred.get('emotion'),
                        float(superb_pred.get('confidence', 0.0)),
                    )
                    logger.info(
                        "[VOICE][CHUNK %d/%d][SUPERB] scores   : %s",
                        i + 1,
                        len(chunks),
                        self._format_scores(superb_pred.get('all_scores', {})),
                    )
                    logger.info(
                        "[VOICE][CHUNK %d/%d][SUPERB] dims     : %s",
                        i + 1,
                        len(chunks),
                        superb_pred.get('dimensions', {}),
                    )
            
            # Step 4: Aggregate chunk results
            if kvilla_results:
                avg_kvilla = self._aggregate_predictions(kvilla_results)
            else:
                avg_kvilla = None
            
            if superb_results:
                avg_superb = self._aggregate_predictions(superb_results)
            else:
                avg_superb = None
            
            # Step 5: Fuse aggregated results
            final_result = self.fuse_predictions(avg_kvilla, avg_superb)

            logger.info(
                "[VOICE][FINAL] emotion=%s confidence=%.4f model=%s scores=%s",
                final_result.get('emotion'),
                float(final_result.get('confidence', 0.0)),
                final_result.get('model'),
                final_result.get('all_scores', {}),
            )

            self._log_fusion_summary(audio_path, len(chunks), avg_kvilla, avg_superb, final_result)
            
            return final_result
        
        except Exception as e:
            logger.error(f"Error in emotion detection pipeline: {e}")
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': str(e)
            }
    
    @staticmethod
    def _aggregate_predictions(predictions: List[Dict]) -> Optional[Dict]:
        """
        Aggregate predictions from multiple chunks
        
        Uses weighted averaging based on confidence
        """
        if not predictions:
            return None
        
        # Weight by confidence
        total_weight = sum(p['confidence'] for p in predictions)
        
        if total_weight == 0:
            # Equal weight if all have zero confidence
            total_weight = len(predictions)
            weights = [1.0 / len(predictions)] * len(predictions)
        else:
            weights = [p['confidence'] / total_weight for p in predictions]
        
        # Aggregate emotion scores
        agg_scores = {}
        for pred, weight in zip(predictions, weights):
            for emotion, score in pred['all_scores'].items():
                agg_scores[emotion] = agg_scores.get(emotion, 0.0) + score * weight
        
        # Normalize
        total = sum(agg_scores.values())
        if total > 0:
            agg_scores = {k: v / total for k, v in agg_scores.items()}
        
        # Get dominant emotion
        emotion = max(agg_scores.items(), key=lambda x: x[1])[0]
        confidence = agg_scores[emotion]
        
        return {
            'emotion': emotion,
            'confidence': float(confidence),
            'all_scores': agg_scores,
            'chunks_analyzed': len(predictions)
        }


# Backward compatibility wrapper
class VoiceEmotionBiLSTM:
    """Wrapper for backward compatibility with existing code"""
    
    def __init__(self, device: str = 'cpu', kvilla_path: Optional[str] = None):
        """Initialize with Kvilla + SUPERB fusion"""
        self.fusion = KvillaSuperBFusion(device=device, kvilla_path=kvilla_path)
        self.device = device
    
    def detect_voice_emotion(self, audio_path: str) -> Dict:
        """Detect emotion from audio file (expected method name by model_manager)"""
        result = self.fusion.detect_emotion(audio_path)
        # Ensure compatibility with existing code
        if 'model' not in result:
            result['model'] = 'kvilla_superb'
        return result
    
    def detect_emotion(self, audio_path: str) -> Dict:
        """Detect emotion from audio file (alternative method name)"""
        return self.detect_voice_emotion(audio_path)



if __name__ == "__main__":
    # Test the implementation
    import sys
    
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
        
        print("Initializing Kvilla + SUPERB Fusion Detector...")
        detector = KvillaSuperBFusion(device='cpu')
        
        print(f"Processing: {audio_file}")
        result = detector.detect_emotion(audio_file)
        
        print("\n" + "="*50)
        print("EMOTION DETECTION RESULT")
        print("="*50)
        print(f"Emotion: {result['emotion'].upper()}")
        print(f"Confidence: {result['confidence']:.2%}")
        print("\nAll Scores:")
        for emotion, score in sorted(result['all_scores'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {emotion:12s}: {score:.2%}")
        
        if 'fusion_info' in result:
            print("\nFusion Details:")
            info = result['fusion_info']
            print(f"  Kvilla:    {info['kvilla_emotion']} ({info['kvilla_confidence']:.2%})")
            print(f"  SUPERB:    {info['superb_emotion']} ({info['superb_confidence']:.2%})")
            print(f"  Agreement: {'✅' if info['agreement'] else '❌'}")
    else:
        print("Usage: python voice_emotion_kvilla_superb.py <audio_file>")
