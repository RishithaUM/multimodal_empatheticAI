from flask import Blueprint, request, jsonify, current_app
from app.models import EmotionRecord, Database
from app.services import token_required, PermissionService, EmotionAnalysisService
from bson import ObjectId

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
