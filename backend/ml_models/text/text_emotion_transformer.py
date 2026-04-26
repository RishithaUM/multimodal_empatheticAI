"""
Text Emotion Detection Model (Ollama)
Uses Ollama for NLP-based emotion recognition with no fallback models.
"""
import json
import logging
import os
from typing import Dict

import requests

logger = logging.getLogger(__name__)

class TextEmotionTransformer:
    """Text emotion detection using Ollama only."""
    
    EMOTIONS = ['angry', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised']
    
    def __init__(self, model_name=None, device='cpu'):
        """Initialize text emotion model.

        The `device` argument is accepted for compatibility with callers.
        """
        _ = device
        self.model_name = model_name or os.getenv('OLLAMA_TEXT_MODEL', 'llama3.1:8b')
        self.ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        self.timeout_seconds = int(os.getenv('OLLAMA_TIMEOUT_SECONDS', 30))
        self.emotion_labels = self.EMOTIONS

        self._load_model()

    def _load_model(self):
        """Verify Ollama availability for the configured model."""
        tags_url = f"{self.ollama_url.rstrip('/')}/api/tags"
        try:
            response = requests.get(tags_url, timeout=self.timeout_seconds)
            response.raise_for_status()
            models = [m.get('name', '') for m in response.json().get('models', [])]
            if self.model_name not in models:
                logger.warning(
                    "Configured Ollama model '%s' not found in local Ollama tags. "
                    "Text detection will fail until the model is pulled.",
                    self.model_name,
                )
            else:
                logger.info("Ollama text emotion model ready: %s", self.model_name)
        except Exception as e:
            logger.warning(
                "Could not verify Ollama model availability at %s: %s",
                tags_url,
                str(e),
            )

    def _normalize_emotion(self, emotion: str) -> str:
        normalized = (emotion or '').strip().lower()
        if normalized in self.EMOTIONS:
            return normalized

        alias_map = {
            # Legacy / LLM variant names → canonical
            'anger':    'angry',
            'joy':      'happy',
            'happiness':'happy',
            'fear':     'fearful',
            'anxious':  'fearful',
            'disgust':  'disgusted',
            'sadness':  'sad',
            'sorrow':   'sad',
            'surprise': 'surprised',
        }
        return alias_map.get(normalized, 'neutral')

    def _call_ollama(self, text: str, include_scores: bool) -> Dict:
        prompt = (
            "You are a precise emotion classifier. Classify the text into EXACTLY ONE of these seven emotions:\n"
            "  angry     — hostility, frustration, rage, irritation, annoyance\n"
            "  disgusted — revulsion, contempt, distaste, loathing\n"
            "  fearful   — anxiety, worry, nervousness, dread, panic, stress, scared, anxious, uneasy\n"
            "  happy     — happiness, excitement, love, gratitude, contentment, pleasure\n"
            "  neutral   — factual, no strong emotion\n"
            "  sad       — grief, depression, loneliness, hopelessness, sorrow, loss\n"
            "  surprised — shock, astonishment, amazement, unexpected\n\n"
            "IMPORTANT: 'anxious', 'worried', 'nervous', 'stressed', 'scared' = fearful, NOT sad.\n"
            "IMPORTANT: 'sad', 'depressed', 'hopeless', 'lonely' = sad, NOT fearful.\n\n"
            "Examples:\n"
            "  'I feel very anxious today' -> fearful\n"
            "  'I am so worried about my exam' -> fearful\n"
            "  'I feel deeply sad and hopeless' -> sad\n"
            "  'I am furious about this' -> angry\n"
            "  'This is disgusting' -> disgusted\n"
            "  'I am so happy!' -> happy\n"
            "  'Wow, I did not expect that!' -> surprised\n\n"
            "Return strict JSON only, no markdown, no explanation.\n"
            "Required keys: emotion (string from the list above), confidence (float 0.0 to 1.0).\n"
        )

        if include_scores:
            prompt += (
                "Also include scores (object) with ALL seven keys "
                "(angry, disgusted, fearful, happy, neutral, sad, surprised) "
                "and probabilities as floats between 0 and 1 summing approximately to 1.\n"
            )

        prompt += f"\nText to classify: \"{text[:1000]}\""

        payload = {
            'model': self.model_name,
            'prompt': prompt,
            'stream': False,
            'format': 'json',
        }

        response = requests.post(
            f"{self.ollama_url.rstrip('/')}/api/generate",
            json=payload,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()

        raw_response = response.json().get('response', '').strip()
        if not raw_response:
            raise ValueError('Empty response from Ollama')

        return json.loads(raw_response)

    
    def detect_emotion(self, text):
        """
        Detect emotion from text
        Returns emotion and confidence
        """
        try:
            if not text or len(text.strip()) == 0:
                return {
                    'emotion': 'neutral',
                    'confidence': 0.0,
                    'error': 'Empty text'
                }

            result = self._call_ollama(text, include_scores=False)
            emotion = self._normalize_emotion(result.get('emotion', 'neutral'))
            confidence = float(result.get('confidence', 0.0))

            return {
                'emotion': emotion,
                'confidence': max(0.0, min(1.0, confidence)),
                'text_length': len(text.split())
            }
        except Exception as e:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': str(e)
            }
    
    def detect_emotion_with_scores(self, text):
        """
        Detect emotion with all emotion scores
        """
        try:
            if not text or len(text.strip()) == 0:
                return {
                    'emotion': 'neutral',
                    'confidence': 0.0,
                    'all_scores': {},
                    'error': 'Empty text'
                }

            result = self._call_ollama(text, include_scores=True)
            emotion = self._normalize_emotion(result.get('emotion', 'neutral'))
            confidence = float(result.get('confidence', 0.0))

            incoming_scores = result.get('scores', {}) or {}
            all_scores = {label: float(incoming_scores.get(label, 0.0)) for label in self.EMOTIONS}

            return {
                'emotion': emotion,
                'confidence': max(0.0, min(1.0, confidence)),
                'all_scores': all_scores,
                'text_length': len(text.split())
            }
        except Exception as e:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'all_scores': {},
                'error': str(e)
            }
    

