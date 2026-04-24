from flask import Blueprint, request, jsonify, current_app
from app.models import EmotionRecord, Database
from app.services import token_required, PermissionService, EmotionAnalysisService, DeepFaceService
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

emotion_bp = Blueprint('emotion', __name__)


@emotion_bp.route('/analyze', methods=['POST'])
@token_required
def analyze_emotion():
    """Analyze emotion from multimodal input"""
    try:
        data = request.get_json()
        user_id = request.user_id
        
        # Extract modality results
        face_emotion = data.get('face_emotion')
        voice_emotion = data.get('voice_emotion')
        text_emotion = data.get('text_emotion')
        weights = data.get('weights', {'face': 0.4, 'voice': 0.3, 'text': 0.3})
        
        if not any([face_emotion, voice_emotion, text_emotion]):
            return jsonify({'error': 'At least one modality input is required'}), 400
        
        db = current_app.db
        emotion_service = current_app.emotion_service
        
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
            current_app.socketio.emit(
                'emotion_with_alert',
                {
                    'emotion_record_id': str(record_id),
                    'fused_result': fused_result,
                    'alerts': alerts
                },
                room=f'user_{user_id}'
            )
        else:
            current_app.socketio.emit(
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
        user_id = request.user_id
        limit = request.args.get('limit', 50, type=int)
        
        db = current_app.db
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
        user_id = request.user_id
        db = current_app.db
        
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


@emotion_bp.route('/stats', methods=['GET'])
@token_required
def get_emotion_stats():
    """Get emotion statistics"""
    try:
        emotion_service = current_app.emotion_service
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
        emotion_service = current_app.emotion_service
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
        user_id = request.user_id
        
        if not data or 'frame' not in data or 'session_id' not in data:
            return jsonify({'error': 'Frame and session_id required'}), 400
        
        frame_data = data.get('frame')
        session_id = data.get('session_id')
        
        # Initialize stability detectors if needed
        if not hasattr(current_app, 'stability_detectors'):
            current_app.stability_detectors = {}
        
        # Get or create detector for this session
        if session_id not in current_app.stability_detectors:
            from app.services.emotion_stability import EmotionStabilityDetector
            current_app.stability_detectors[session_id] = EmotionStabilityDetector(
                stability_frames=10,
                confidence_threshold=0.40
            )
        
        detector = current_app.stability_detectors[session_id]
        
        # Initialize DeepFace service if needed
        if not hasattr(current_app, 'deepface_service'):
            current_app.deepface_service = DeepFaceService()
        
        deepface_service = current_app.deepface_service
        
        # Analyze single frame
        result = deepface_service.analyze_frame(frame_data)
        
        if not result.get('success'):
            frame_number = detector.frame_count + 1 if session_id in current_app.stability_detectors else 0
            return jsonify({
                'success': False,
                'error': result.get('error'),
                'stable': False,
                'frame_number': frame_number
            }), 200
        
        # Extract emotion data
        emotion_data = {
            'emotion': result['emotion'],
            'confidence': result['confidence'],
            'scores': result['scores']
        }
        
        # Add to detector history
        detector.add_emotion(emotion_data)
        
        # Check if stable
        is_stable = detector.is_stable()
        stable_emotion = detector.get_stable_emotion()
        
        # Clean up session if stable (check exists first)
        if is_stable and session_id in current_app.stability_detectors:
            del current_app.stability_detectors[session_id]
        
        response = {
            'success': True,
            'frame_emotion': result['emotion'],
            'frame_confidence': result['confidence'],
            'frame_scores': result['scores'],
            'frame_number': detector.frame_count,
            'stable': is_stable,
            'stable_emotion': stable_emotion,
            'history_size': len(detector.get_emotion_history()),
        }
        
        # Only include full history if requested (for debugging)
        if data.get('include_history'):
            response['emotion_history'] = detector.get_emotion_history()
        
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
            current_app.stability_detectors = {}
        
        # Get or create detector for this session
        if session_id not in current_app.stability_detectors:
            from app.services.emotion_stability import EmotionStabilityDetector
            current_app.stability_detectors[session_id] = EmotionStabilityDetector(
                stability_frames=10,
                confidence_threshold=0.40
            )
        
        detector = current_app.stability_detectors[session_id]
        
        # Initialize DeepFace service if needed
        if not hasattr(current_app, 'deepface_service'):
            current_app.deepface_service = DeepFaceService()
        
        deepface_service = current_app.deepface_service
        
        # Analyze single frame
        result = deepface_service.analyze_frame(frame_data)
        
        if not result.get('success'):
            frame_number = detector.frame_count + 1 if session_id in current_app.stability_detectors else 0
            return jsonify({
                'success': False,
                'error': result.get('error'),
                'stable': False,
                'frame_number': frame_number
            }), 200
        
        # Extract emotion data
        emotion_data = {
            'emotion': result['emotion'],
            'confidence': result['confidence'],
            'scores': result['scores']
        }
        
        # Add to detector history
        detector.add_emotion(emotion_data)
        
        # Check if stable
        is_stable = detector.is_stable()
        stable_emotion = detector.get_stable_emotion()
        
        # Clean up session if stable (check exists first)
        if is_stable and session_id in current_app.stability_detectors:
            del current_app.stability_detectors[session_id]
        
        response = {
            'success': True,
            'frame_emotion': result['emotion'],
            'frame_confidence': result['confidence'],
            'frame_scores': result['scores'],
            'frame_number': detector.frame_count,
            'stable': is_stable,
            'stable_emotion': stable_emotion,
            'history_size': len(detector.get_emotion_history()),
        }
        
        # Only include full history if requested (for debugging)
        if data.get('include_history'):
            response['emotion_history'] = detector.get_emotion_history()
        
        return jsonify(response), 200
        
    except Exception as e:
        import traceback
        logger.error(f"Streaming error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500
