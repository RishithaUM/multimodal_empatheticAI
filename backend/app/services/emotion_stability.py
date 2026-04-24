"""
Emotion Stability Detector
Detects when facial emotion becomes stable and consistent
"""
from collections import deque
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)


class EmotionStabilityDetector:
    """
    Tracks emotion across frames and detects when emotion becomes stable.
    Used for real-time streaming emotion detection.
    """
    
    def __init__(self, stability_frames: int = 10, confidence_threshold: float = 0.40):
        """
        Initialize emotion stability detector
        
        Args:
            stability_frames: Number of consecutive frames needed for stability (default: 10)
            confidence_threshold: Minimum confidence required for emotion (default: 0.40 = 40%)
        """
        self.emotion_history: deque = deque(maxlen=10)  # Keep last 10 emotions
        self.stability_frames = stability_frames
        self.confidence_threshold = confidence_threshold
        self.frame_count = 0
    
    def add_emotion(self, emotion_data: Dict) -> None:
        """
        Add emotion from a frame to history
        
        Args:
            emotion_data: Dict with 'emotion', 'confidence', 'scores'
        """
        self.emotion_history.append(emotion_data)
        self.frame_count += 1
        
        logger.debug(
            f"Frame {self.frame_count}: {emotion_data['emotion']} "
            f"({emotion_data['confidence']*100:.1f}%) - "
            f"History size: {len(self.emotion_history)}"
        )
    
    def is_stable(self) -> bool:
        """
        Check if emotion has become stable
        
        Returns:
            True if emotion is stable, False otherwise
        """
        # Need minimum frames
        if len(self.emotion_history) < self.stability_frames:
            return False
        
        # Get last N emotions
        last_n = list(self.emotion_history)[-self.stability_frames:]
        
        # Extract emotion names and confidences
        emotions = [e.get('emotion') for e in last_n]
        confidences = [e.get('confidence', 0) for e in last_n]
        
        # All must be the same emotion
        if len(set(emotions)) != 1:
            logger.debug(f"Emotions vary: {emotions}")
            return False
        
        # All must have good confidence
        min_confidence = min(confidences)
        if min_confidence < self.confidence_threshold:
            logger.debug(f"Low confidence: {min_confidence:.2f} < {self.confidence_threshold}")
            return False
        
        logger.info(
            f"✅ STABLE! {emotions[0]} consistently detected "
            f"with confidence {min_confidence:.2f}"
        )
        return True
    
    def get_stable_emotion(self) -> Optional[Dict]:
        """
        Get the stable emotion if it exists
        
        Returns:
            Dict with stable emotion data, or None if not stable
        """
        if self.is_stable() and len(self.emotion_history) > 0:
            return dict(self.emotion_history[-1])
        return None
    
    def get_emotion_history(self) -> List[Dict]:
        """Get list of emotion history"""
        return list(self.emotion_history)
    
    def reset(self) -> None:
        """Reset detector for new session"""
        self.emotion_history.clear()
        self.frame_count = 0
        logger.info("Emotion detector reset")
