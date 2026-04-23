"""
Face Emotion Detection Model (CNN)
Uses pre-trained models for real-time facial emotion recognition
"""
import torch
import torch.nn as nn
from torchvision import transforms, models
import cv2
import numpy as np
from PIL import Image
import os


class FaceEmotionCNN:
    """Facial emotion detection using CNN"""
    
    EMOTIONS = ['angry', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised']
    
    def __init__(self, model_path=None, device='cpu'):
        """Initialize face emotion model"""
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.emotion_labels = self.EMOTIONS
        self.preprocess = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])
        
        self.model = self._load_model(model_path)
    
    def _load_model(self, model_path):
        """Load or create CNN model"""
        if model_path and os.path.exists(model_path):
            # Load pre-trained model
            model = torch.load(model_path, map_location=self.device)
        else:
            # Use pre-trained ResNet50 and finetune for emotions
            model = models.resnet50(pretrained=True)
            # Modify final layer for 7 emotions
            model.fc = nn.Linear(model.fc.in_features, len(self.EMOTIONS))
        
        model = model.to(self.device)
        model.eval()
        return model
    
    def detect_emotion(self, image_input):
        """
        Detect emotion from image (file path or PIL Image)
        Returns emotion and confidence
        """
        try:
            # Load image
            if isinstance(image_input, str):
                image = Image.open(image_input).convert('RGB')
            else:
                image = image_input
            
            # Preprocess
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
            
            # Inference
            with torch.no_grad():
                logits = self.model(image_tensor)
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
                'all_scores': all_scores
            }
        except Exception as e:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': str(e),
                'all_scores': {}
            }
    
    def detect_faces_and_emotions(self, frame):
        """
        Detect all faces in frame and their emotions
        frame: numpy array (opencv format)
        Returns: list of face detections with emotions
        """
        try:
            # Load cascade classifier for face detection
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            face_cascade = cv2.CascadeClassifier(cascade_path)
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            )
            
            results = []
            for (x, y, w, h) in faces:
                # Extract face region
                face_roi = frame[y:y+h, x:x+w]
                face_image = Image.fromarray(cv2.cvtColor(face_roi, cv2.COLOR_BGR2RGB))
                
                # Detect emotion
                emotion_result = self.detect_emotion(face_image)
                
                results.append({
                    'face_box': {'x': int(x), 'y': int(y), 'w': int(w), 'h': int(h)},
                    'emotion': emotion_result['emotion'],
                    'confidence': emotion_result['confidence'],
                    'scores': emotion_result.get('all_scores', {})
                })
            
            # Return dominant emotion if multiple faces
            if results:
                dominant = max(results, key=lambda r: r['confidence'])
                return {
                    'dominant_emotion': dominant['emotion'],
                    'dominant_confidence': dominant['confidence'],
                    'face_count': len(results),
                    'faces': results
                }
            else:
                return {
                    'dominant_emotion': 'neutral',
                    'dominant_confidence': 0.0,
                    'face_count': 0,
                    'faces': []
                }
        except Exception as e:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'error': str(e)
            }
