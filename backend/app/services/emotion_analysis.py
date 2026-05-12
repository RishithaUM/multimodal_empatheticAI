from datetime import datetime, timedelta
from collections import deque
import numpy as np


class EmotionAnalysisService:
    """Emotion detection and analysis service"""
    
    NEGATIVE_EMOTIONS = ['sad', 'anxious', 'angry', 'fearful', 'disgusted', 'distressed']
    CONSECUTIVE_ALERT_EMOTIONS = {'sad', 'angry', 'fearful', 'fear'}
    POSITIVE_EMOTIONS = ['happy', 'excited', 'content', 'calm']
    
    def __init__(self, max_history=200):
        """Initialize emotion analysis service"""
        self.emotion_history = deque(maxlen=max_history)
        self.alert_cooldown = {}  # Track alert cooldowns
    
    def fuse_emotions(self, face_emotion=None, voice_emotion=None, text_emotion=None, weights=None):
        """Fuse multimodal emotion detection results"""
        if weights is None:
            weights = {
                'face': 0.4,
                'voice': 0.3,
                'text': 0.3
            }
        
        # Collect available modalities
        modalities = {}
        confidences = []
        emotions = []
        
        if face_emotion:
            modalities['face'] = face_emotion
            confidences.append(face_emotion.get('confidence', 0) * weights['face'])
            emotions.append(face_emotion.get('emotion', 'neutral'))
        
        if voice_emotion:
            modalities['voice'] = voice_emotion
            confidences.append(voice_emotion.get('confidence', 0) * weights['voice'])
            emotions.append(voice_emotion.get('emotion', 'neutral'))
        
        if text_emotion:
            modalities['text'] = text_emotion
            confidences.append(text_emotion.get('confidence', 0) * weights['text'])
            emotions.append(text_emotion.get('emotion', 'neutral'))
        
        # Calculate fused confidence
        fused_confidence = sum(confidences) if confidences else 0
        
        # Determine dominant emotion
        dominant_emotion = max(emotions, key=emotions.count) if emotions else 'neutral'
        
        # Calculate intensity
        intensity = min(100, fused_confidence * 100)
        intensity_label = self._get_intensity_label(intensity)
        
        return {
            'emotion': dominant_emotion,
            'confidence': min(1.0, fused_confidence),
            'intensity': intensity,
            'intensity_label': intensity_label,
            'modalities': modalities,
            'fusion_weights': weights,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def add_to_history(self, emotion_data):
        """Add emotion to history for tracking"""
        self.emotion_history.append({
            'emotion': emotion_data.get('emotion'),
            'intensity': emotion_data.get('intensity'),
            'timestamp': emotion_data.get('timestamp', datetime.utcnow().isoformat())
        })
    
    def get_history(self, limit=50):
        """Get emotion history"""
        return list(self.emotion_history)[-limit:]
    
    def check_distress_alerts(self, emotion_data, guardian_emails=None, cooldown_minutes=10):
        """Check if emotion triggers distress alerts"""
        alerts = []
        # Alert: Fear/Sad/Angry repeated 3 times in a row
        repeated_negative = self._check_repeated_negative_emotions(threshold=3)
        if repeated_negative['triggered']:
            alerts.append({
                'type': 'REPEATED_NEGATIVE',
                'severity': 'warning',
                'count': repeated_negative['count'],
                'description': 'Fear, Sad, or Angry detected 3 consecutive times'
            })
        
        # Apply cooldown
        filtered_alerts = []
        for alert in alerts:
            alert_key = alert['type']
            if self._is_alert_on_cooldown(alert_key, cooldown_minutes):
                continue
            filtered_alerts.append(alert)
            self._set_alert_cooldown(alert_key)
        
        return filtered_alerts
    
    def _check_repeated_negative_emotions(self, threshold=3):
        """Check if the same alert-worthy emotion appears consecutively."""
        if len(self.emotion_history) < threshold:
            return {'triggered': False, 'count': 0}
        
        recent = list(self.emotion_history)[-threshold:]
        recent_emotions = [str(entry.get('emotion', '')).lower() for entry in recent]
        trigger_emotion = recent_emotions[0] if recent_emotions else ''

        if not trigger_emotion or trigger_emotion not in self.CONSECUTIVE_ALERT_EMOTIONS:
            return {'triggered': False, 'count': 0}

        if any(emotion != trigger_emotion for emotion in recent_emotions):
            return {'triggered': False, 'count': 0}
        
        return {
            'triggered': True,
            'count': threshold
        }
    
    def _check_prolonged_distress(self, window_minutes=30, threshold=5):
        """Check for prolonged distress pattern"""
        if not self.emotion_history:
            return {'triggered': False, 'count': 0}
        
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        negative_in_window = 0
        for entry in self.emotion_history:
            try:
                entry_time = datetime.fromisoformat(entry['timestamp'])
                if entry_time > window_start and entry['emotion'].lower() in self.NEGATIVE_EMOTIONS:
                    negative_in_window += 1
            except:
                continue
        
        return {
            'triggered': negative_in_window >= threshold,
            'count': negative_in_window
        }
    
    def _is_alert_on_cooldown(self, alert_key, cooldown_minutes):
        """Check if alert is on cooldown"""
        if alert_key not in self.alert_cooldown:
            return False
        
        cooldown_until = self.alert_cooldown[alert_key]
        return datetime.utcnow() < cooldown_until
    
    def _set_alert_cooldown(self, alert_key, cooldown_minutes=10):
        """Set alert cooldown"""
        self.alert_cooldown[alert_key] = datetime.utcnow() + timedelta(minutes=cooldown_minutes)
    
    def _get_intensity_label(self, intensity):
        """Get intensity label from intensity value"""
        if intensity < 33:
            return 'Low'
        elif intensity < 67:
            return 'Medium'
        else:
            return 'High'
    
    def get_emotion_stats(self, time_window_minutes=60):
        """Get emotion statistics for a time window"""
        if not self.emotion_history:
            return {}
        
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=time_window_minutes)
        
        emotions_in_window = []
        for entry in self.emotion_history:
            try:
                entry_time = datetime.fromisoformat(entry['timestamp'])
                if entry_time > window_start:
                    emotions_in_window.append(entry)
            except:
                continue
        
        if not emotions_in_window:
            return {}
        
        emotion_counts = {}
        total_intensity = 0
        
        for entry in emotions_in_window:
            emotion = entry['emotion']
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            total_intensity += entry['intensity']
        
        avg_intensity = total_intensity / len(emotions_in_window)
        dominant_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else 'neutral'
        
        return {
            'time_window_minutes': time_window_minutes,
            'emotion_count': len(emotions_in_window),
            'dominant_emotion': dominant_emotion,
            'emotion_distribution': emotion_counts,
            'average_intensity': avg_intensity,
            'negative_emotion_count': sum(1 for e in emotions_in_window if e['emotion'].lower() in self.NEGATIVE_EMOTIONS)
        }
