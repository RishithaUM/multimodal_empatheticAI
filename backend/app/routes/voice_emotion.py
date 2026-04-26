"""
Voice Emotion Detection Routes
Handles audio file uploads and real-time voice emotion analysis
"""
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import tempfile
import logging
from app.services import token_required

logger = logging.getLogger(__name__)

voice_emotion_bp = Blueprint('voice_emotion', __name__, url_prefix='/api/emotion/voice')

# Allowed audio formats
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg', 'flac', 'm4a'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@voice_emotion_bp.route('/detect', methods=['POST'])
@token_required
def detect_voice_emotion():
    """
    Detect emotion from voice audio
    
    Expects: multipart/form-data with 'audio' file
    Returns: {
        'emotion': str,
        'confidence': float,
        'all_scores': dict,
        'model_type': str
    }
    """
    try:
        # Check file presence
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No audio file selected'
            }), 400
        
        # Validate file
        if not allowed_file(audio_file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Supported: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Check file size
        audio_file.seek(0, os.SEEK_END)
        file_size = audio_file.tell()
        audio_file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'success': False,
                'error': f'File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.0f}MB'
            }), 400
        
        # Save to temp file
        temp_dir = tempfile.gettempdir()
        filename = secure_filename(audio_file.filename)
        filepath = os.path.join(temp_dir, filename)
        
        try:
            audio_file.save(filepath)
            
            # Get model manager from app context
            if not hasattr(current_app, 'ml_model_manager') or _app().ml_model_manager is None:
                return jsonify({
                    'success': False,
                    'error': 'Voice emotion model not initialized'
                }), 500
            
            # Detect emotion
            result = _app().ml_model_manager.detect_voice_emotion(filepath)
            
            # Check for errors
            if 'error' in result and result.get('confidence', 0) == 0:
                return jsonify({
                    'success': False,
                    'error': result['error'],
                    'emotion': 'neutral'
                }), 400
            
            return jsonify({
                'success': True,
                'emotion': result.get('emotion', 'neutral'),
                'confidence': result.get('confidence', 0),
                'all_scores': result.get('all_scores', {}),
                'model_type': result.get('model_type', 'unknown'),
                'audio_features': result.get('audio_features')
            }), 200
        
        finally:
            # Clean up temp file
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except Exception as e:
                    logger.warning(f"Could not delete temp file {filepath}: {str(e)}")
    
    except Exception as e:
        logger.error(f"Voice emotion detection error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@voice_emotion_bp.route('/detect/stream', methods=['POST'])
@token_required
def detect_voice_emotion_stream():
    """
    Stream audio chunks for real-time voice emotion detection
    
    Expects: JSON with {
        'audio_chunk': base64 encoded audio bytes,
        'session_id': str (for session continuity),
        'sample_rate': int (default 16000)
    }
    Returns: Real-time emotion predictions
    """
    try:
        data = request.get_json()
        
        if not data or 'audio_chunk' not in data or 'session_id' not in data:
            return jsonify({
                'success': False,
                'error': 'audio_chunk and session_id required'
            }), 400
        
        session_id = data.get('session_id')
        audio_chunk = data.get('audio_chunk')  # Base64 encoded
        sample_rate = data.get('sample_rate', 16000)
        
        # Initialize streaming sessions if needed
        if not hasattr(current_app, 'voice_streaming_sessions'):
            _app().voice_streaming_sessions = {}
        
        # Get or create session
        if session_id not in _app().voice_streaming_sessions:
            _app().voice_streaming_sessions[session_id] = {
                'chunks': [],
                'total_duration': 0
            }
        
        session = _app().voice_streaming_sessions[session_id]
        
        # Decode and add chunk
        import base64
        import io
        
        try:
            audio_bytes = base64.b64decode(audio_chunk)
            session['chunks'].append(audio_bytes)
            session['total_duration'] += len(audio_bytes) / sample_rate / 2  # 16-bit audio
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Could not decode audio: {str(e)}'
            }), 400
        
        # Check if enough data accumulated (at least 0.5 seconds)
        if session['total_duration'] < 0.5:
            return jsonify({
                'success': True,
                'buffering': True,
                'buffered_duration': session['total_duration'],
                'message': 'Buffering audio...'
            }), 200
        
        # Combine chunks and detect emotion
        import numpy as np
        combined_audio = b''.join(session['chunks'])
        audio_array = np.frombuffer(combined_audio, dtype=np.int16).astype(np.float32) / 32768.0
        
        if not hasattr(current_app, 'ml_model_manager') or _app().ml_model_manager is None:
            return jsonify({
                'success': False,
                'error': 'Voice emotion model not initialized'
            }), 500
        
        # Detect emotion
        result = _app().ml_model_manager.detect_voice_emotion(audio_array)
        
        return jsonify({
            'success': True,
            'emotion': result.get('emotion', 'neutral'),
            'confidence': result.get('confidence', 0),
            'all_scores': result.get('all_scores', {}),
            'buffered_duration': session['total_duration'],
            'model_type': result.get('model_type', 'unknown')
        }), 200
    
    except Exception as e:
        logger.error(f"Voice streaming error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@voice_emotion_bp.route('/stream/reset', methods=['POST'])
@token_required
def reset_voice_stream():
    """Reset a streaming session"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'session_id required'
            }), 400
        
        if hasattr(current_app, 'voice_streaming_sessions'):
            if session_id in _app().voice_streaming_sessions:
                del _app().voice_streaming_sessions[session_id]
        
        return jsonify({
            'success': True,
            'message': f'Session {session_id} reset'
        }), 200
    
    except Exception as e:
        logger.error(f"Stream reset error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@voice_emotion_bp.route('/models', methods=['GET'])
def get_available_models():
    """Get information about available voice emotion models"""
    return jsonify({
        'success': True,
        'models': {
            'wav2vec2-emotion-english': {
                'name': 'WAV2VEC2 Emotion (English)',
                'emotions': ['anger', 'disgust', 'fear', 'happiness', 'neutral', 'sadness'],
                'accuracy': '~82%',
                'inference_time': '50-100ms (GPU), 150-200ms (CPU)',
                'recommended': True
            },
            'wav2vec2-emotion-audeering': {
                'name': 'WAV2VEC2 Emotion (Audeering)',
                'emotions': ['anger', 'disgust', 'fear', 'happiness', 'neutral', 'sadness'],
                'accuracy': '~80%',
                'inference_time': '50-100ms (GPU), 150-200ms (CPU)',
                'recommended': False
            }
        },
        'supported_formats': ['wav', 'mp3', 'ogg', 'flac', 'm4a'],
        'max_file_size_mb': 50,
        'sample_rate': 16000,
        'min_duration_seconds': 1,
        'max_duration_seconds': 30
    }), 200


@voice_emotion_bp.route('/test', methods=['POST'])
def test_voice_emotion():
    """
    Test endpoint for voice emotion detection (no auth required)
    
    Expects: multipart/form-data with 'audio' file
    """
    try:
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No audio file selected'
            }), 400
        
        if not allowed_file(audio_file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Supported: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Save to temp file
        temp_dir = tempfile.gettempdir()
        filename = secure_filename(audio_file.filename)
        filepath = os.path.join(temp_dir, filename)
        
        try:
            audio_file.save(filepath)
            
            if not hasattr(current_app, 'ml_model_manager') or _app().ml_model_manager is None:
                return jsonify({
                    'success': False,
                    'error': 'Voice emotion model not initialized'
                }), 500
            
            result = _app().ml_model_manager.detect_voice_emotion(filepath)
            
            if 'error' in result and result.get('confidence', 0) == 0:
                return jsonify({
                    'success': False,
                    'error': result['error'],
                    'emotion': 'neutral'
                }), 400
            
            return jsonify({
                'success': True,
                'emotion': result.get('emotion', 'neutral'),
                'confidence': result.get('confidence', 0),
                'all_scores': result.get('all_scores', {}),
                'model_type': result.get('model_type', 'unknown'),
                'audio_features': result.get('audio_features')
            }), 200
        
        finally:
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except:
                    pass
    
    except Exception as e:
        logger.error(f"Test voice emotion error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
