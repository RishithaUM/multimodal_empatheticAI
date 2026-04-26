from flask import Blueprint, request, jsonify, current_app
from typing import cast
from app import AppFlask
from app.models import EmotionRecord, Database
from app.services import token_required, PermissionService, EmotionAnalysisService, DeepFaceService
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

emotion_bp = Blueprint('emotion', __name__)

# Helper so every handler can access typed app attributes without Pylance errors
def _app() -> AppFlask:
    return cast(AppFlask, current_app._get_current_object())  # type: ignore[attr-defined]


def _to_json_safe(value):
    """Recursively convert numpy scalars/containers to JSON-safe Python types."""
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_json_safe(v) for v in value]
    if isinstance(value, tuple):
        return tuple(_to_json_safe(v) for v in value)
    if hasattr(value, 'item'):
        try:
            return value.item()
        except Exception:
            return value
    return value


@emotion_bp.route('/analyze', methods=['POST'])
@token_required
def analyze_emotion():
    """Analyze emotion from multimodal input"""
    try:
        data = request.get_json()
        user_id = request.user_id  # type: ignore[attr-defined]
        face_emotion = data.get('face_emotion')
        voice_emotion = data.get('voice_emotion')
        text_emotion = data.get('text_emotion')
        weights = data.get('weights', {'face': 0.4, 'voice': 0.3, 'text': 0.3})
        
        if not any([face_emotion, voice_emotion, text_emotion]):
            return jsonify({'error': 'At least one modality input is required'}), 400
        
        db = _app().db
        emotion_service = _app().emotion_service
        
        # Fuse emotions
        fused_result = emotion_service.fuse_emotions(
            face_emotion=face_emotion,
            voice_emotion=voice_emotion,
            text_emotion=text_emotion,
            weights=weights
        )
        
        # Add to history
        emotion_service.add_to_history(fused_result)
        
        # Create emotion record in database
        emotion_data = {
            'emotion': fused_result['emotion'],
            'confidence': fused_result['confidence'],
            'intensity': fused_result['intensity'],
            'intensity_label': fused_result['intensity_label'],
            'modalities': fused_result['modalities'],
            'fusion_weights': fused_result['fusion_weights'],
            'metadata': data.get('metadata', {}),
            'image_url': data.get('image_url'),
            'audio_url': data.get('audio_url')
        }
        
        record_id = EmotionRecord.create(db, user_id, emotion_data)
        
        # Check for distress alerts
        alerts = emotion_service.check_distress_alerts(fused_result)
        
        # Emit to WebSocket
        if alerts:
            _app().socketio.emit(
                'emotion_with_alert',
                {
                    'emotion_record_id': str(record_id),
                    'fused_result': fused_result,
                    'alerts': alerts
                },
                room=f'user_{user_id}'
            )
        else:
            _app().socketio.emit(
                'emotion_detected',
                {
                    'emotion_record_id': str(record_id),
                    'fused_result': fused_result
                },
                room=f'user_{user_id}'
            )
        
        return jsonify({
            'success': True,
            'emotion_record_id': str(record_id),
            'fused_result': fused_result,
            'alerts': alerts
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/history', methods=['GET'])
@token_required
def get_emotion_history():
    """Get user emotion history"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        limit = request.args.get('limit', 50, type=int)
        
        db = _app().db
        history = EmotionRecord.get_user_history(db, user_id, limit=limit)
        
        # Convert ObjectId to string
        for record in history:
            record['_id'] = str(record['_id'])
            record['user_id'] = str(record['user_id'])
        
        return jsonify({
            'success': True,
            'count': len(history),
            'history': history
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/record/<record_id>', methods=['GET'])
@token_required
def get_emotion_record(record_id):
    """Get specific emotion record"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db
        
        try:
            record = EmotionRecord.get_by_id(db, record_id)
        except:
            return jsonify({'error': 'Invalid record ID'}), 400
        
        if not record:
            return jsonify({'error': 'Record not found'}), 404
        
        # Check permission
        if not PermissionService.is_owner(user_id, str(record['user_id'])):
            return jsonify({'error': 'Unauthorized'}), 403
        
        record['_id'] = str(record['_id'])
        record['user_id'] = str(record['user_id'])
        
        return jsonify({
            'success': True,
            'record': record
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/record/<record_id>', methods=['DELETE'])
@token_required
def delete_emotion_record(record_id):
    """Delete a specific emotion record belonging to the current user"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db

        try:
            record = EmotionRecord.get_by_id(db, record_id)
        except Exception:
            return jsonify({'error': 'Invalid record ID'}), 400

        if not record:
            return jsonify({'error': 'Record not found'}), 404

        if not PermissionService.is_owner(user_id, str(record['user_id'])):
            return jsonify({'error': 'Unauthorized'}), 403

        from bson import ObjectId as _ObjId
        db[EmotionRecord.collection_name].delete_one({'_id': _ObjId(record_id)})

        return jsonify({'success': True}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/stats', methods=['GET'])
@token_required
def get_emotion_stats():
    """Get emotion statistics"""
    try:
        emotion_service = _app().emotion_service
        time_window = request.args.get('time_window_minutes', 60, type=int)
        
        stats = emotion_service.get_emotion_stats(time_window_minutes=time_window)
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/current', methods=['GET'])
@token_required
def get_current_emotion():
    """Get current emotion from history"""
    try:
        emotion_service = _app().emotion_service
        history = emotion_service.get_history(limit=1)
        
        if not history:
            return jsonify({
                'success': True,
                'current_emotion': None
            }), 200
        
        return jsonify({
            'success': True,
            'current_emotion': history[0]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500




# ─── STREAMING ENDPOINTS (Real-time Emotion Detection) ────────────────────────


# ─── STREAMING ENDPOINTS (Real-time Emotion Detection) ────────────────────────

@emotion_bp.route('/detect/face/stream', methods=['POST'])
@token_required
def detect_face_emotion_stream():
    """
    Stream endpoint - analyzes single frame and checks for emotion stability.
    Used for real-time emotion detection that stops when stable.
    """
    try:
        data = request.get_json()
        user_id = request.user_id  # type: ignore[attr-defined]
        
        if not data or 'frame' not in data or 'session_id' not in data:
            return jsonify({'error': 'Frame and session_id required'}), 400
        
        frame_data = data.get('frame')
        session_id = data.get('session_id')
        
        # Initialize stability detectors if needed
        if not hasattr(current_app, 'stability_detectors'):
            _app().stability_detectors = {}
        
        # Get or create detector for this session
        if session_id not in _app().stability_detectors:
            from app.services.emotion_stability import EmotionStabilityDetector
            _app().stability_detectors[session_id] = EmotionStabilityDetector(
                stability_frames=10,
                confidence_threshold=0.40
            )
        
        detector = _app().stability_detectors[session_id]
        
        # Initialize DeepFace service if needed
        if not hasattr(current_app, 'deepface_service'):
            _app().deepface_service = DeepFaceService()
        
        deepface_service = _app().deepface_service
        
        # Analyze single frame
        result = deepface_service.analyze_frame(frame_data)
        
        if not result.get('success'):
            frame_number = detector.frame_count + 1 if session_id in _app().stability_detectors else 0
            return jsonify({
                'success': False,
                'error': result.get('error'),
                'stable': False,
                'frame_number': frame_number
            }), 200
        
        # Extract emotion data and normalize possible numpy scalar values
        emotion_data = _to_json_safe({
            'emotion': result['emotion'],
            'confidence': result['confidence'],
            'scores': result['scores']
        })
        
        # Add to detector history
        detector.add_emotion(emotion_data)
        
        # Check if stable
        is_stable = detector.is_stable()
        stable_emotion = detector.get_stable_emotion()
        
        # Clean up session if stable (check exists first)
        if is_stable and session_id in _app().stability_detectors:
            del _app().stability_detectors[session_id]
        
        response: dict = cast(dict, _to_json_safe({
            'success': True,
            'frame_emotion': result['emotion'],
            'frame_confidence': result['confidence'],
            'frame_scores': result['scores'],
            'frame_number': detector.frame_count,
            'stable': is_stable,
            'stable_emotion': stable_emotion,
            'history_size': len(detector.get_emotion_history()),
        }))
        
        # Only include full history if requested (for debugging)
        if data.get('include_history'):
            response['emotion_history'] = _to_json_safe(detector.get_emotion_history())
        
        return jsonify(response), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Streaming error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/detect/face/stream/test', methods=['POST'])
def detect_face_emotion_stream_test():
    """
    Test endpoint for streaming - analyzes single frame and checks for emotion stability.
    No auth required for testing.
    """
    try:
        data = request.get_json()
        
        if not data or 'frame' not in data or 'session_id' not in data:
            return jsonify({'error': 'Frame and session_id required'}), 400
        
        frame_data = data.get('frame')
        session_id = data.get('session_id')
        
        # Initialize stability detectors if needed
        if not hasattr(current_app, 'stability_detectors'):
            _app().stability_detectors = {}
        
        # Get or create detector for this session
        if session_id not in _app().stability_detectors:
            from app.services.emotion_stability import EmotionStabilityDetector
            _app().stability_detectors[session_id] = EmotionStabilityDetector(
                stability_frames=10,
                confidence_threshold=0.40
            )
        
        detector = _app().stability_detectors[session_id]
        
        # Initialize DeepFace service if needed
        if not hasattr(current_app, 'deepface_service'):
            _app().deepface_service = DeepFaceService()
        
        deepface_service = _app().deepface_service
        
        # Analyze single frame
        result = deepface_service.analyze_frame(frame_data)
        
        if not result.get('success'):
            frame_number = detector.frame_count + 1 if session_id in _app().stability_detectors else 0
            return jsonify({
                'success': False,
                'error': result.get('error'),
                'stable': False,
                'frame_number': frame_number
            }), 200
        
        # Extract emotion data and normalize possible numpy scalar values
        emotion_data = _to_json_safe({
            'emotion': result['emotion'],
            'confidence': result['confidence'],
            'scores': result['scores']
        })
        
        # Add to detector history
        detector.add_emotion(emotion_data)
        
        # Check if stable
        is_stable = detector.is_stable()
        stable_emotion = detector.get_stable_emotion()
        
        # Clean up session if stable (check exists first)
        if is_stable and session_id in _app().stability_detectors:
            del _app().stability_detectors[session_id]
        
        response: dict = cast(dict, _to_json_safe({
            'success': True,
            'frame_emotion': result['emotion'],
            'frame_confidence': result['confidence'],
            'frame_scores': result['scores'],
            'frame_number': detector.frame_count,
            'stable': is_stable,
            'stable_emotion': stable_emotion,
            'history_size': len(detector.get_emotion_history()),
        }))
        
        # Only include full history if requested (for debugging)
        if data.get('include_history'):
            response['emotion_history'] = _to_json_safe(detector.get_emotion_history())
        
        return jsonify(response), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Streaming error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


# ─── VOICE EMOTION DETECTION (wav2vec2-based) ────────────────────────────────

@emotion_bp.route('/detect/text', methods=['POST'])
@token_required
def detect_text_emotion():
    """Detect emotion from text using the configured text model."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        text = data.get('text', '')
        if not isinstance(text, str) or not text.strip():
            return jsonify({'error': 'Text is required'}), 400

        if not hasattr(current_app, 'ml_model_manager') or _app().ml_model_manager is None:
            return jsonify({'error': 'ML model manager is not initialized'}), 500

        print(f"\n[TEXT EMOTION] Input text: '{text}'")
        logger.info(f"[TEXT EMOTION] Detecting emotion for text: '{text}'")

        result = _app().ml_model_manager.detect_text_emotion(text)
        if not isinstance(result, dict):
            return jsonify({'error': 'Invalid response from text model'}), 500

        if result.get('error'):
            return jsonify({'error': result['error']}), 500

        print(f"[TEXT EMOTION] Ollama result -> emotion: '{result.get('emotion')}', confidence: {result.get('confidence')}")
        print(f"[TEXT EMOTION] Full result: {result}")
        logger.info(f"[TEXT EMOTION] Result -> emotion: {result.get('emotion')}, confidence: {result.get('confidence')}")

        return jsonify({
            'success': True,
            'emotion': result.get('emotion', 'neutral'),
            'confidence': float(result.get('confidence', 0.0)),
            'scores': result.get('all_scores', result.get('scores', {})),
            'metadata': {
                'text_length': result.get('text_length', len(text.split())),
            }
        }), 200
    except Exception as e:
        import traceback
        logger.error(f"Text emotion detection error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/detect/text/test', methods=['POST'])
def detect_text_emotion_test():
    """Test endpoint (no auth) for text emotion detection."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        text = data.get('text', '')
        if not isinstance(text, str) or not text.strip():
            return jsonify({'error': 'Text is required'}), 400

        if not hasattr(current_app, 'ml_model_manager') or _app().ml_model_manager is None:
            return jsonify({'error': 'ML model manager is not initialized'}), 500

        print(f"\n[TEXT EMOTION TEST] Input text: '{text}'")
        logger.info(f"[TEXT EMOTION TEST] Detecting emotion for text: '{text}'")

        result = _app().ml_model_manager.detect_text_emotion(text)
        if not isinstance(result, dict):
            return jsonify({'error': 'Invalid response from text model'}), 500

        if result.get('error'):
            return jsonify({'error': result['error']}), 500

        print(f"[TEXT EMOTION TEST] Ollama result -> emotion: '{result.get('emotion')}', confidence: {result.get('confidence')}")
        print(f"[TEXT EMOTION TEST] Full result: {result}")
        logger.info(f"[TEXT EMOTION TEST] Result -> emotion: {result.get('emotion')}, confidence: {result.get('confidence')}")

        return jsonify({
            'success': True,
            'emotion': result.get('emotion', 'neutral'),
            'confidence': float(result.get('confidence', 0.0)),
            'scores': result.get('all_scores', result.get('scores', {})),
            'metadata': {
                'text_length': result.get('text_length', len(text.split())),
            }
        }), 200
    except Exception as e:
        import traceback
        logger.error(f"Text emotion test detection error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/youtube-suggestions', methods=['POST', 'OPTIONS'])
def get_youtube_suggestions():
    """
    Use Ollama to generate YouTube search queries for an emotion,
    then return real YouTube search URLs.
    No auth required — called from results page.
    """
    from flask import make_response
    if request.method == 'OPTIONS':
        resp = make_response('', 204)
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return resp

    import os, requests as req_lib
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        emotion = (data.get('emotion') or '').strip().lower()
        if not emotion:
            return jsonify({'error': 'emotion is required'}), 400

        ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        model = os.getenv('OLLAMA_TEXT_MODEL', 'llama3.1:8b')

        prompt = (
            f"The user is feeling '{emotion}'. "
            "From your training knowledge, recommend exactly 4 real YouTube videos that would help them cope with or improve this emotional state. "
            "You must provide real YouTube video IDs that you know exist from your training data. "
            "Return strict JSON only — an array of exactly 4 objects, no explanation, no markdown. "
            "Each object must have: \"title\" (the video title) and \"url\" (full YouTube URL like https://www.youtube.com/watch?v=VIDEO_ID). "
            "Example format: [{\"title\": \"Box Breathing Exercise\", \"url\": \"https://www.youtube.com/watch?v=tEmt1Znux58\"}, ...]"
        )

        payload = {
            'model': model,
            'prompt': prompt,
            'stream': False,
            'format': 'json',
        }

        response = req_lib.post(
            f"{ollama_url.rstrip('/')}/api/generate",
            json=payload,
            timeout=60,
        )
        response.raise_for_status()

        raw = response.json().get('response', '').strip()
        import json as _json, re as _re

        # Try to parse whatever Ollama returned
        items: list = []
        try:
            parsed = _json.loads(raw)
        except _json.JSONDecodeError:
            m = _re.search(r'\[.*?\]', raw, _re.DOTALL)
            parsed = _json.loads(m.group()) if m else []

        # Accept bare list or wrapped object
        if isinstance(parsed, list):
            items = parsed
        elif isinstance(parsed, dict):
            for key in ('videos', 'items', 'results', 'suggestions', 'queries'):
                if isinstance(parsed.get(key), list):
                    items = parsed[key]
                    break
            if not items:
                for val in parsed.values():
                    if isinstance(val, list):
                        items = val
                        break

        # Normalise each item — accept {title, url} objects or plain strings
        videos = []
        for item in items[:4]:
            if isinstance(item, dict):
                title = str(item.get('title') or item.get('name') or 'Video')
                url = str(item.get('url') or item.get('link') or item.get('href') or '')
            else:
                title = str(item)
                url = ''
            # Only keep proper YouTube watch URLs
            if url and 'youtube.com/watch?v=' in url:
                videos.append({'title': title, 'url': url})

        # Pad with search URLs if Ollama gave bad/missing links
        import urllib.parse
        fallback_queries = {
            'angry':     ['box breathing for anger', 'meditation for anger relief', 'boxing workout stress relief', 'calm piano music relax'],
            'disgusted': ['satisfying cleaning compilation', 'relaxing asmr nature sounds', 'beautiful nature 4k', 'aesthetic cooking satisfying'],
            'fearful':   ['5 minute anxiety relief breathing', 'grounding technique for anxiety', 'you are not alone motivational', 'calm music for anxiety'],
            'happy':     ['feel good dance music mix', 'beautiful travel destinations', 'epic celebration moments', 'positive energy morning music'],
            'neutral':   ['amazing facts mind blowing', 'ted talk power of habits', 'productivity tips that work', 'science explained simply'],
            'sad':       ['try not to laugh funny clips', 'stand up comedy best moments', 'cute animals being adorable', 'motivation for hard days'],
            'surprised': ['mind blowing facts you wont believe', 'incredible twist moments compilation', 'amazing science experiments', 'best magic tricks revealed'],
        }
        fallbacks = fallback_queries.get(emotion, fallback_queries['neutral'])
        while len(videos) < 4:
            q = fallbacks[len(videos)]
            videos.append({'title': q.title(), 'url': f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(q)}"})

        logger.info("[YOUTUBE SUGGESTIONS] emotion=%s videos=%s", emotion, [v['url'] for v in videos])

        return jsonify({'success': True, 'emotion': emotion, 'videos': videos}), 200

    except Exception as e:
        import traceback
        logger.error(f"YouTube suggestions error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


# ─── VOICE EMOTION DETECTION (wav2vec2-based) ────────────────────────────────

@emotion_bp.route('/detect/voice', methods=['POST'])
@token_required
def detect_voice_emotion():
    """
    Detect emotion from voice audio using wav2vec2 embeddings.
    Expects base64-encoded audio data or audio file path.
    """
    try:
        import tempfile
        import base64
        from pathlib import Path
        
        user_id = request.user_id  # type: ignore[attr-defined]
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        detector = None
        if hasattr(current_app, 'ml_model_manager') and _app().ml_model_manager is not None:
            detector = getattr(_app().ml_model_manager, 'voice_model', None)

        if detector is None:
            return jsonify({'error': 'Voice model is not initialized in MLModelManager'}), 500
        
        # Get audio data (either base64 or file path)
        audio_data = data.get('audio_data')
        audio_path = data.get('audio_path')
        
        if not audio_data and not audio_path:
            return jsonify({'error': 'Either audio_data or audio_path is required'}), 400
        
        # Create temporary file if audio_data is provided
        if audio_data:
            try:
                # Decode base64 audio
                audio_bytes = base64.b64decode(audio_data)
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                    tmp.write(audio_bytes)
                    audio_path = tmp.name
            except Exception as e:
                return jsonify({'error': f'Failed to decode audio data: {str(e)}'}), 400
        
        # Detect emotion
        try:
            result = detector.detect_emotion(audio_path)
            
            # Clean up temp file if created
            if audio_data and Path(audio_path).exists():
                Path(audio_path).unlink()
            
            if (isinstance(result, dict) and result.get('success') is False) or ('error' in result and result.get('confidence', 0) == 0):
                logger.warning(f"Voice detection returned degraded result: {result.get('error', 'unknown error')}")
                return jsonify({
                    'success': True,
                    'emotion': result.get('emotion', 'neutral'),
                    'confidence': float(result.get('confidence', 0.0)),
                    'scores': result.get('scores', {}) or result.get('all_scores', {}),
                    'metadata': {
                        'degraded': True,
                        'warning': result.get('error', 'Voice emotion detection degraded')
                    }
                }), 200
            
            return jsonify({
                'success': True,
                'emotion': result['emotion'],
                'confidence': result['confidence'],
                'scores': result.get('scores', result.get('all_scores', {})),
                'metadata': result.get('metadata', {})
            }), 200
        
        except Exception as e:
            # Clean up temp file if created
            if audio_data and Path(audio_path).exists():
                Path(audio_path).unlink()
            
            raise
    
    except Exception as e:
        import traceback
        logger.error(f"Voice emotion detection error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/detect/voice/test', methods=['POST'])
def detect_voice_emotion_test():
    """
    Test endpoint (no auth) for voice emotion detection.
    Accepts the same payload format as /detect/voice.
    """
    try:
        import tempfile
        import base64
        from pathlib import Path

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        detector = None
        if hasattr(current_app, 'ml_model_manager') and _app().ml_model_manager is not None:
            detector = getattr(_app().ml_model_manager, 'voice_model', None)

        if detector is None:
            return jsonify({'error': 'Voice model is not initialized in MLModelManager'}), 500

        audio_data = data.get('audio_data')
        audio_path = data.get('audio_path')

        if not audio_data and not audio_path:
            return jsonify({'error': 'Either audio_data or audio_path is required'}), 400

        if audio_data:
            try:
                audio_bytes = base64.b64decode(audio_data)
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                    tmp.write(audio_bytes)
                    audio_path = tmp.name
            except Exception as e:
                return jsonify({'error': f'Failed to decode audio data: {str(e)}'}), 400

        try:
            result = detector.detect_emotion(audio_path)

            if audio_data and Path(audio_path).exists():
                Path(audio_path).unlink()

            if (isinstance(result, dict) and result.get('success') is False) or ('error' in result and result.get('confidence', 0) == 0):
                logger.warning(f"Voice test detection returned degraded result: {result.get('error', 'unknown error')}")
                return jsonify({
                    'success': True,
                    'emotion': result.get('emotion', 'neutral'),
                    'confidence': float(result.get('confidence', 0.0)),
                    'scores': result.get('scores', {}) or result.get('all_scores', {}),
                    'metadata': {
                        'degraded': True,
                        'warning': result.get('error', 'Voice emotion detection degraded')
                    }
                }), 200

            return jsonify({
                'success': True,
                'emotion': result['emotion'],
                'confidence': result['confidence'],
                'scores': result.get('scores', result.get('all_scores', {})),
                'metadata': result.get('metadata', {})
            }), 200

        except Exception:
            if audio_data and Path(audio_path).exists():
                Path(audio_path).unlink()
            raise

    except Exception as e:
        import traceback
        logger.error(f"Voice emotion test detection error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/detect/voice/stream', methods=['POST'])
@token_required
def detect_voice_emotion_stream():
    """
    Stream endpoint for voice emotion - analyzes audio chunks.
    Useful for real-time voice emotion detection.
    """
    try:
        import base64
        import tempfile
        from pathlib import Path
        
        user_id = request.user_id  # type: ignore[attr-defined]
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get audio chunk and session ID
        audio_chunk = data.get('audio_chunk')  # base64 encoded
        session_id = data.get('session_id')
        
        if not audio_chunk or not session_id:
            return jsonify({'error': 'audio_chunk and session_id are required'}), 400
        
        detector = None
        if hasattr(current_app, 'ml_model_manager') and _app().ml_model_manager is not None:
            detector = getattr(_app().ml_model_manager, 'voice_model', None)

        if detector is None:
            return jsonify({'error': 'Voice model is not initialized in MLModelManager'}), 500
        
        # Initialize session history if needed
        if not hasattr(current_app, 'voice_session_history'):
            _app().voice_session_history = {}
        
        if session_id not in _app().voice_session_history:
            _app().voice_session_history[session_id] = {
                'chunks': [],
                'emotions': []
            }
        
        # Decode and add audio chunk
        try:
            audio_bytes = base64.b64decode(audio_chunk)
            _app().voice_session_history[session_id]['chunks'].append(audio_bytes)
        except Exception as e:
            return jsonify({'error': f'Failed to decode audio chunk: {str(e)}'}), 400
        
        # Analyze chunk if we have accumulated enough data
        chunk_count = len(_app().voice_session_history[session_id]['chunks'])
        analyze_every_n_chunks = data.get('analyze_every_n_chunks', 2)
        
        if chunk_count % analyze_every_n_chunks == 0:
            try:
                # Combine chunks into single audio
                combined_audio = b''.join(_app().voice_session_history[session_id]['chunks'])
                
                # Create temporary file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                    tmp.write(combined_audio)
                    audio_path = tmp.name
                
                # Analyze emotion
                result = detector.detect_emotion(audio_path)
                
                # Clean up temp file
                Path(audio_path).unlink()
                
                if result.get('success'):
                    _app().voice_session_history[session_id]['emotions'].append(
                        result['emotion']
                    )
                
                return jsonify({
                    'success': True,
                    'chunk_number': chunk_count,
                    'analyzed': True,
                    'emotion': result.get('emotion', 'unknown'),
                    'confidence': result.get('confidence', 0),
                    'scores': result.get('scores', {}),
                    'emotion_count': len(_app().voice_session_history[session_id]['emotions'])
                }), 200
            except Exception as e:
                logger.error(f"Voice streaming analysis error: {str(e)}")
                return jsonify({
                    'success': True,
                    'chunk_number': chunk_count,
                    'analyzed': False,
                    'error': str(e)
                }), 200
        else:
            # Just accumulate chunks
            return jsonify({
                'success': True,
                'chunk_number': chunk_count,
                'analyzed': False,
                'message': f'Accumulated {chunk_count} chunks'
            }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Voice streaming error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@emotion_bp.route('/detect/voice/stream/end', methods=['POST'])
@token_required
def detect_voice_emotion_stream_end():
    """
    Finalize voice emotion streaming session.
    Returns final emotion analysis and cleans up session.
    """
    try:
        from app.services.wav2vec2_emotion import Wav2Vec2EmotionDetector
        from collections import Counter
        
        user_id = request.user_id  # type: ignore[attr-defined]
        data = request.get_json()
        
        if not data or 'session_id' not in data:
            return jsonify({'error': 'session_id is required'}), 400
        
        session_id = data.get('session_id')
        
        # Get session history
        if not hasattr(current_app, 'voice_session_history'):
            return jsonify({'error': 'Session not found'}), 404
        
        if session_id not in _app().voice_session_history:
            return jsonify({'error': 'Session not found'}), 404
        
        session = _app().voice_session_history[session_id]
        emotions = session.get('emotions', [])
        
        # Determine final emotion
        if emotions:
            # Use most common emotion
            emotion_counter = Counter(emotions)
            final_emotion = emotion_counter.most_common(1)[0][0]
            emotion_frequency = emotion_counter.most_common(1)[0][1]
            confidence = emotion_frequency / len(emotions)
        else:
            final_emotion = 'unknown'
            confidence = 0.0
        
        # Clean up session
        del _app().voice_session_history[session_id]
        
        return jsonify({
            'success': True,
            'final_emotion': final_emotion,
            'confidence': float(confidence),
            'emotion_count': len(emotions),
            'emotion_history': emotions
        }), 200
    
    except Exception as e:
        import traceback
        logger.error(f"Voice streaming end error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
