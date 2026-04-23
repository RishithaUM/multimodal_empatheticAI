"""
Text Emotion Detection Model (Transformer)
Uses HuggingFace Transformers for NLP-based emotion recognition
"""
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import os


class TextEmotionTransformer:
    """Text emotion detection using Transformers"""
    
    EMOTIONS = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise']
    
    def __init__(self, model_name=None, device='cpu'):
        """Initialize text emotion model"""
        self.device = device if torch.cuda.is_available() else 'cpu'
        self.model_name = model_name or 'distilbert-base-uncased-finetuned-emotion'
        self.emotion_labels = self.EMOTIONS
        
        self._load_model()
    
    def _load_model(self):
        """Load Transformer model from HuggingFace"""
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name
            ).to(self.device)
            self.model.eval()
            
            # Create pipeline for easier inference
            self.pipeline = pipeline(
                'text-classification',
                model=self.model_name,
                device=0 if torch.cuda.is_available() else -1
            )
        except Exception as e:
            print(f"Error loading model {self.model_name}: {str(e)}")
            # Fallback to simpler model
            self.model_name = 'distilbert-base-uncased'
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=len(self.EMOTIONS)
            ).to(self.device)
    
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
            
            # Truncate very long texts
            text = text[:512]
            
            # Using pipeline (simpler)
            result = self.pipeline(text)
            
            emotion = result[0]['label']
            confidence = result[0]['score']
            
            return {
                'emotion': emotion,
                'confidence': confidence,
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
            
            # Tokenize
            text = text[:512]
            inputs = self.tokenizer(text, return_tensors='pt', padding=True).to(self.device)
            
            # Inference
            with torch.no_grad():
                logits = self.model(**inputs).logits
                probabilities = torch.nn.functional.softmax(logits, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
            
            emotion_idx = predicted.item()
            emotion = self.emotion_labels[emotion_idx] if emotion_idx < len(self.emotion_labels) else 'neutral'
            confidence = confidence.item()
            
            # Get all emotion scores
            all_scores = {
                self.emotion_labels[i]: float(probabilities[0, i].item())
                for i in range(min(len(self.emotion_labels), probabilities.shape[1]))
            }
            
            return {
                'emotion': emotion,
                'confidence': confidence,
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
    
    def analyze_sentiment_polarity(self, text):
        """
        Analyze sentiment polarity (positive/negative/neutral)
        """
        try:
            result = self.detect_emotion(text)
            
            # Map emotions to polarity
            positive = ['joy', 'surprise']
            negative = ['anger', 'disgust', 'fear', 'sadness']
            
            emotion = result['emotion'].lower()
            
            if emotion in positive:
                polarity = 'positive'
            elif emotion in negative:
                polarity = 'negative'
            else:
                polarity = 'neutral'
            
            return {
                'emotion': result['emotion'],
                'confidence': result['confidence'],
                'polarity': polarity
            }
        except Exception as e:
            return {
                'emotion': 'neutral',
                'confidence': 0.0,
                'polarity': 'neutral',
                'error': str(e)
            }
    
    def extract_keywords(self, text):
        """
        Extract emotion keywords from text
        """
        try:
            emotion_keywords = {
                'joy': ['happy', 'love', 'great', 'wonderful', 'amazing', 'excellent'],
                'sadness': ['sad', 'unhappy', 'depressed', 'down', 'miserable', 'cry'],
                'anger': ['angry', 'mad', 'furious', 'hate', 'rage', 'upset'],
                'fear': ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous'],
                'disgust': ['disgusting', 'gross', 'hate', 'repulsive', 'vile', 'awful'],
                'surprise': ['wow', 'amazing', 'unexpected', 'shocked', 'astonished'],
                'neutral': ['ok', 'fine', 'normal', 'regular', 'average']
            }
            
            text_lower = text.lower()
            found_keywords = {}
            
            for emotion, keywords in emotion_keywords.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        if emotion not in found_keywords:
                            found_keywords[emotion] = []
                        found_keywords[emotion].append(keyword)
            
            return found_keywords
        except Exception as e:
            return {'error': str(e)}
