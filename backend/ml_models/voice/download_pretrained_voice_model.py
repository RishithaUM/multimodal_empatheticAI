"""
Download pretrained voice emotion detection models from Hugging Face

Available pretrained models:
1. WAV2VEC2 Fine-tuned for emotion detection
2. UniSpeech-SAT for speech understanding
3. HuBERT for universal speech representation
"""
import os
import torch
import json
from pathlib import Path
from transformers import AutoProcessor, AutoModelForAudioClassification, pipeline
import numpy as np


class PretrainedVoiceEmotionDownloader:
    """Download and manage pretrained voice emotion models from Hugging Face"""
    
    # Popular pretrained models for emotion detection
    AVAILABLE_MODELS = {
        'wav2vec2-emotion-simple': {
            'model_id': 'ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition',
            'processor_id': 'ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition',
            'emotions': ['angry', 'calm', 'disgust', 'fearful', 'happy', 'neutral', 'sad', 'surprised'],
            'description': 'WAV2VEC2 fine-tuned for English speech emotion recognition'
        },
        'wav2vec2-emotion-multilingual': {
            'model_id': 'facebook/wav2vec2-base',
            'processor_id': 'facebook/wav2vec2-base',
            'emotions': ['anger', 'disgust', 'fear', 'happiness', 'neutral', 'sadness'],
            'description': 'WAV2VEC2 Base model with custom emotion classification'
        }
    }
    
    def __init__(self, cache_dir='pretrained_models'):
        """Initialize downloader"""
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.models_info_path = self.cache_dir / 'models_info.json'
    
    def list_available_models(self):
        """List all available pretrained models"""
        print("\n" + "="*80)
        print("AVAILABLE PRETRAINED VOICE EMOTION MODELS")
        print("="*80 + "\n")
        
        for model_name, info in self.AVAILABLE_MODELS.items():
            print(f"📦 Model: {model_name}")
            print(f"   Description: {info['description']}")
            print(f"   Emotions: {', '.join(info['emotions'])}")
            print(f"   Model ID: {info['model_id']}")
            print()
    
    def download_model(self, model_name='speech-emotion-recognition-english'):
        """
        Download a pretrained model from Hugging Face
        
        Args:
            model_name: Name of the model to download
        
        Returns:
            Path to downloaded model directory
        """
        if model_name not in self.AVAILABLE_MODELS:
            raise ValueError(f"Model '{model_name}' not found. Available: {list(self.AVAILABLE_MODELS.keys())}")
        
        model_info = self.AVAILABLE_MODELS[model_name]
        model_path = self.cache_dir / model_name
        
        print(f"\n{'='*80}")
        print(f"Downloading: {model_name}")
        print(f"{'='*80}\n")
        print(f"📥 Model: {model_info['model_id']}")
        print(f"📥 Processor: {model_info['processor_id']}")
        
        try:
            # Create directory for this model
            model_path.mkdir(parents=True, exist_ok=True)
            
            # Download processor
            print("\n📥 Downloading processor...")
            processor = AutoProcessor.from_pretrained(model_info['processor_id'])
            processor.save_pretrained(str(model_path / 'processor'))
            print("✅ Processor downloaded")
            
            # Download model
            print("📥 Downloading model weights...")
            model = AutoModelForAudioClassification.from_pretrained(model_info['model_id'])
            model.save_pretrained(str(model_path / 'model'))
            print("✅ Model weights downloaded")
            
            # Save metadata
            metadata = {
                'model_id': model_info['model_id'],
                'processor_id': model_info['processor_id'],
                'emotions': model_info['emotions'],
                'description': model_info['description'],
                'num_emotions': len(model_info['emotions'])
            }
            
            with open(model_path / 'metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print(f"\n✅ Model saved to: {model_path}")
            print(f"📊 Emotions: {', '.join(model_info['emotions'])}")
            
            # Update models info
            self._update_models_info(model_name, model_path)
            
            return model_path
            
        except Exception as e:
            print(f"\n❌ Error downloading model: {str(e)}")
            raise
    
    def _update_models_info(self, model_name, model_path):
        """Update the models info JSON file"""
        models_info = {}
        if self.models_info_path.exists():
            with open(self.models_info_path, 'r') as f:
                models_info = json.load(f)
        
        models_info[model_name] = {
            'path': str(model_path),
            'downloaded': True
        }
        
        with open(self.models_info_path, 'w') as f:
            json.dump(models_info, f, indent=2)
    
    def download_all_models(self):
        """Download all available models"""
        print("\n🚀 Starting download of all models...")
        downloaded = []
        failed = []
        
        for model_name in self.AVAILABLE_MODELS.keys():
            try:
                self.download_model(model_name)
                downloaded.append(model_name)
                print()
            except Exception as e:
                failed.append((model_name, str(e)))
                print(f"⚠️  Failed to download {model_name}")
        
        print("\n" + "="*80)
        print("DOWNLOAD SUMMARY")
        print("="*80)
        print(f"✅ Successfully downloaded: {len(downloaded)}")
        for model in downloaded:
            print(f"   - {model}")
        
        if failed:
            print(f"\n❌ Failed: {len(failed)}")
            for model, error in failed:
                print(f"   - {model}: {error}")
        
        return downloaded, failed


def main():
    """Main function"""
    import sys
    
    downloader = PretrainedVoiceEmotionDownloader()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'list':
            downloader.list_available_models()
        elif command == 'download-all':
            downloader.download_all_models()
        elif command == 'download':
            model_name = sys.argv[2] if len(sys.argv) > 2 else 'speech-emotion-recognition-english'
            downloader.download_model(model_name)
        else:
            print(f"Unknown command: {command}")
            print("\nUsage:")
            print("  python download_pretrained_voice_model.py list")
            print("  python download_pretrained_voice_model.py download [model_name]")
            print("  python download_pretrained_voice_model.py download-all")
    else:
        # Default: list and download the recommended model
        downloader.list_available_models()
        print("\n🔄 Downloading recommended model: speech-emotion-recognition-english")
        downloader.download_model('speech-emotion-recognition-english')


if __name__ == '__main__':
    main()
