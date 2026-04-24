import cv2
import numpy as np
import base64
import io
from PIL import Image
import logging

logger = logging.getLogger(__name__)


class DeepFaceService:
    """DeepFace emotion detection service with Haar Cascade face detection"""
    
    EMOTION_MAPPING = {
        'angry': 'Angry',
        'disgust': 'Disgusted',
        'fear': 'Fearful',
        'happy': 'Happy',
        'neutral': 'Neutral',
        'sad': 'Sad',
        'surprise': 'Surprised'
    }
    
    def __init__(self):
        """Initialize DeepFace service with Haar Cascade classifier"""
        # Load Haar Cascade for face detection (more reliable for face ROI extraction)
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            logger.warning("Failed to load Haar Cascade classifier")
    
    
    def _enhance_brightness(self, image_array, target_brightness=100):
        """
        Enhance image brightness for better face detection in dark environments
        Uses CLAHE (Contrast Limited Adaptive Histogram Equalization)
        
        Args:
            image_array: numpy array representation of image
            target_brightness: target average brightness level (0-255)
            
        Returns:
            brightness-enhanced image as numpy array
        """
        try:
            if not isinstance(image_array, np.ndarray):
                return image_array
                
            # Validate shape
            if len(image_array.shape) != 3 or image_array.shape[2] not in [3, 4]:
                return image_array
            
            # Convert BGR to grayscale for brightness analysis
            if image_array.shape[2] == 3:
                gray = cv2.cvtColor(image_array, cv2.COLOR_BGR2GRAY)
            else:  # RGBA
                bgr = image_array[:, :, :3]
                gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            
            # Calculate current brightness
            current_brightness = float(np.mean(gray))
            
            # Only enhance if image is too dark
            if current_brightness < 80:
                # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                enhanced_gray = clahe.apply(gray)
                
                # Convert back to BGR
                enhanced_bgr = cv2.cvtColor(enhanced_gray, cv2.COLOR_GRAY2BGR)
                
                # Apply global brightness adjustment
                brightness_ratio = target_brightness / (current_brightness + 1e-5)
                brightness_ratio = min(brightness_ratio, 2.0)  # Cap to prevent over-enhancement
                
                enhanced_bgr = cv2.convertScaleAbs(enhanced_bgr, alpha=brightness_ratio, beta=0)
                logger.debug(f"Enhanced brightness from {current_brightness:.1f} to ~{target_brightness}")
                return enhanced_bgr
            
            return image_array
        except Exception as e:
            logger.warning(f"Brightness enhancement failed: {type(e).__name__}: {str(e)}, using original image")
            return image_array
    
    def analyze_frame(self, image_data):
        """
        Analyze emotion from a single frame/image using Haar Cascade + DeepFace
        Following the approach from the reference implementation for better accuracy
        
        Args:
            image_data: base64 encoded image string or PIL Image or numpy array
            
        Returns:
            dict with emotion, confidence, and all emotion scores
        """
        try:
            # Lazy import to avoid dependency issues at startup
            from deepface import DeepFace
            
            # Convert to numpy array if needed
            if isinstance(image_data, str):
                # Handle base64 encoded image
                image_data = self._base64_to_image(image_data)
            
            if isinstance(image_data, Image.Image):
                image_data = np.array(image_data)
            
            # Validate image
            if not isinstance(image_data, np.ndarray) or len(image_data.shape) != 3:
                return self._no_face_detected()
            
            # Convert RGB to BGR if needed (canvas/PIL gives RGB, OpenCV uses BGR)
            if image_data.shape[2] == 3:
                # Check if it's likely RGB by comparing color channels
                try:
                    image_data = cv2.cvtColor(image_data, cv2.COLOR_RGB2BGR)
                except:
                    pass  # Already BGR or invalid, continue anyway
            elif image_data.shape[2] == 4:
                # RGBA, convert to BGR
                image_data = cv2.cvtColor(image_data[:, :, :3], cv2.COLOR_RGB2BGR)
            
            # Enhance brightness if image is too dark
            image_data = self._enhance_brightness(image_data)
            
            # Step 1: Detect faces using Haar Cascade (more reliable for face ROI extraction)
            gray_frame = cv2.cvtColor(image_data, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray_frame,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            if len(faces) == 0:
                # No faces detected with Haar Cascade, return not detected
                return self._no_face_detected()
            
            # Step 2: Extract face ROI from the largest detected face
            (x, y, w, h) = max(faces, key=lambda f: f[2] * f[3])  # Get largest face
            face_roi = image_data[y:y + h, x:x + w]
            
            # Step 3: Analyze emotions on face ROI using DeepFace
            result = DeepFace.analyze(
                face_roi,
                actions=['emotion'],
                enforce_detection=False
            )
            
            # Handle DeepFace result format
            if not result:
                return self._no_face_detected()
            
            if isinstance(result, list):
                if len(result) == 0:
                    return self._no_face_detected()
                face_result = result[0]
            elif isinstance(result, dict):
                face_result = result
            else:
                logger.warning(f"Unexpected DeepFace result format: {type(result)}")
                return self._no_face_detected()
            
            # Extract emotions from face result
            emotions = face_result.get('emotion', {})
            if not emotions or len(emotions) == 0:
                return self._no_face_detected()
            
            # Get dominant emotion
            dominant_emotion_key = max(emotions, key=emotions.get)
            dominant_emotion = self.EMOTION_MAPPING.get(dominant_emotion_key, dominant_emotion_key.title())
            confidence = emotions[dominant_emotion_key] / 100.0  # Convert to 0-1 range
            
            # Prepare all emotion scores
            all_scores = []
            for emotion_key, score in emotions.items():
                emotion_label = self.EMOTION_MAPPING.get(emotion_key, emotion_key.title())
                all_scores.append({
                    'emotion': emotion_label,
                    'confidence': round(score / 100.0, 3)  # Convert percentage to 0-1
                })
            
            # Sort by confidence
            all_scores.sort(key=lambda x: x['confidence'], reverse=True)
            
            return {
                'success': True,
                'emotion': dominant_emotion,
                'confidence': round(confidence, 3),
                'scores': all_scores,
                'raw_emotions': emotions,
                'face_detected': True,
                'face_region': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)}
            }
            
        except Exception as e:
            import traceback
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.error(f"DeepFace analysis error: {error_msg}\nTraceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': error_msg,
                'emotion': 'Neutral',
                'confidence': 0
            }

    
    def _base64_to_image(self, base64_str):
        """Convert base64 string to PIL Image"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_str:
                base64_str = base64_str.split(',')[1]
            
            image_data = base64.b64decode(base64_str)
            image = Image.open(io.BytesIO(image_data))
            return image
        except Exception as e:
            logger.error(f"Base64 conversion error: {str(e)}")
            raise
    
    def _no_face_detected(self):
        """Return default response when no face is detected"""
        return {
            'success': False,
            'error': 'No face detected in image',
            'emotion': 'Neutral',
            'confidence': 0,
            'scores': [
                {'emotion': 'Neutral', 'confidence': 0},
                {'emotion': 'Happy', 'confidence': 0},
                {'emotion': 'Sad', 'confidence': 0},
                {'emotion': 'Angry', 'confidence': 0},
                {'emotion': 'Fearful', 'confidence': 0},
                {'emotion': 'Disgusted', 'confidence': 0},
                {'emotion': 'Surprised', 'confidence': 0}
            ]
        }
