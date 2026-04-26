from flask import Blueprint, request, jsonify, current_app, make_response
from app.models import GuardianAlert, User, Database
from app.services import token_required, PermissionService, EmailNotificationService
from datetime import datetime, timezone
from bson import ObjectId
import uuid

alerts_bp = Blueprint('alerts', __name__)

from typing import cast
from app import AppFlask

def _app() -> AppFlask:
    return cast(AppFlask, current_app._get_current_object())  # type: ignore[attr-defined]


@alerts_bp.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response


@alerts_bp.route('/send-email', methods=['OPTIONS'])
def send_alert_email_options():
    """Handle CORS preflight for send-email"""
    return make_response('', 204)


@alerts_bp.route('/test-email', methods=['POST', 'OPTIONS'])
def send_test_email():
    """Send a test alert email — no auth required for quick testing"""
    if request.method == 'OPTIONS':
        return make_response('', 204)
    try:
        data = request.get_json(force=True) or {}
        recipient = data.get('to', '23rahul54@gmail.com')
        user_name = data.get('userName', 'Test User')
        emotion = data.get('emotion', 'Anxious')
        severity = data.get('severity', 'warning')
        alert_type = data.get('trigger', 'HIGH_INTENSITY')

        if not current_app.config.get('EMAIL_API_KEY'):
            return jsonify({'success': False, 'error': 'Email API key not configured'}), 503

        result = EmailNotificationService.send_guardian_alert(
            [recipient], user_name, emotion, severity, alert_type,
            confidence=data.get('confidence', 50),
            intensity=data.get('intensity', 50),
            message=data.get('message', ''),
            timestamp=data.get('timestamp'),
        )
        return jsonify({
            'success': result.get('success', False),
            'recipient': recipient,
            'sentCount': result.get('sent_count', 0),
            'error': result.get('error'),
        }), 200 if result.get('success') else 502
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/send-email', methods=['POST'])
@token_required
def send_alert_email():
    """Send a guardian alert email via SendGrid"""

    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        data = request.get_json(force=True) or {}

        recipient_emails = data.get('to', [])
        emotion = data.get('emotion', 'Unknown')
        severity = data.get('severity', 'warning')
        alert_type = data.get('trigger', 'HIGH_INTENSITY')
        user_name = data.get('userName', 'EmpathAI User')

        if not recipient_emails:
            return jsonify({'error': 'No recipient emails provided'}), 400

        # Check email is configured
        if not current_app.config.get('EMAIL_FROM_ADDRESS') or not current_app.config.get('EMAIL_API_KEY'):
            return jsonify({'success': False, 'error': 'Email service not configured on server'}), 503

        result = EmailNotificationService.send_guardian_alert(
            recipient_emails, user_name, emotion, severity, alert_type,
            confidence=data.get('confidence', 50),
            intensity=data.get('intensity', 50),
            message=data.get('message', ''),
            timestamp=data.get('timestamp'),
        )

        return jsonify({
            'success': result.get('success', False),
            'messageId': str(uuid.uuid4()) if result.get('success') else None,
            'sentCount': result.get('sent_count', 0),
            'error': result.get('error'),
        }), 200 if result.get('success') else 502

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@alerts_bp.route('/create', methods=['POST'])
@token_required
def create_alert():
    """Create guardian alert"""
    try:
        data = request.get_json()
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db
        
        # Get user
        user = User.get_by_id(db, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Validate alert data
        alert_type = data.get('alert_type')
        severity = data.get('severity', 'warning')
        emotion_data = data.get('emotion_data', {})
        guardian_emails = data.get('guardian_emails', [])
        
        if not alert_type:
            return jsonify({'error': 'Alert type is required'}), 400
        
        if alert_type not in GuardianAlert.ALERT_TYPES:
            return jsonify({'error': f'Invalid alert type. Must be one of: {", ".join(GuardianAlert.ALERT_TYPES)}'}), 400
        
        # Create alert
        alert_id = GuardianAlert.create(
            db, user_id, alert_type, severity, emotion_data, guardian_emails
        )
        
        # Send emails if configured
        if guardian_emails and _app().config['EMAIL_FROM_ADDRESS']:
            email_result = EmailNotificationService.send_guardian_alert(
                guardian_emails,
                user.get('username', 'User'),
                emotion_data.get('emotion', 'Unknown'),
                severity,
                alert_type,
                confidence=emotion_data.get('confidence', 50),
                intensity=emotion_data.get('intensity', 50),
                message=emotion_data.get('message', ''),
                timestamp=emotion_data.get('timestamp'),
            )
            
            if email_result['success']:
                GuardianAlert.update_status(db, alert_id, 'sent', datetime.utcnow())
            else:
                GuardianAlert.update_status(db, alert_id, 'failed')
        
        return jsonify({
            'success': True,
            'alert_id': str(alert_id),
            'message': 'Alert created successfully'
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alerts_bp.route('/history', methods=['GET'])
@token_required
def get_alert_history():
    """Get user alert history"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        limit = request.args.get('limit', 50, type=int)
        status = request.args.get('status')
        
        db = _app().db
        
        query = {'user_id': ObjectId(user_id)}
        if status:
            query['status'] = status
        
        alerts = list(db[GuardianAlert.collection_name].find(query).sort('created_at', -1).limit(limit))
        
        def _to_utc_iso(dt):
            if not hasattr(dt, 'isoformat'):
                return dt
            if getattr(dt, 'tzinfo', None) is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

        # Convert ObjectIds and datetimes to JSON-safe strings
        for alert in alerts:
            alert['_id'] = str(alert['_id'])
            alert['user_id'] = str(alert['user_id'])
            if 'created_at' in alert and hasattr(alert['created_at'], 'isoformat'):
                alert['created_at'] = _to_utc_iso(alert['created_at'])
            if 'updated_at' in alert and hasattr(alert['updated_at'], 'isoformat'):
                alert['updated_at'] = _to_utc_iso(alert['updated_at'])
            if 'sent_at' in alert and alert['sent_at'] and hasattr(alert['sent_at'], 'isoformat'):
                alert['sent_at'] = _to_utc_iso(alert['sent_at'])
        
        return jsonify({
            'success': True,
            'count': len(alerts),
            'alerts': alerts
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alerts_bp.route('/pending', methods=['GET'])
@token_required
def get_pending_alerts():
    """Get pending alerts for all users (admin only)"""
    try:
        db = _app().db
        alerts = GuardianAlert.get_pending(db)
        
        for alert in alerts:
            alert['_id'] = str(alert['_id'])
            alert['user_id'] = str(alert['user_id'])
        
        return jsonify({
            'success': True,
            'count': len(alerts),
            'alerts': alerts
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alerts_bp.route('/<alert_id>/dismiss', methods=['PUT'])
@token_required
def dismiss_alert(alert_id):
    """Dismiss an alert"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db
        
        try:
            alert = db[GuardianAlert.collection_name].find_one({'_id': ObjectId(alert_id)})
        except:
            return jsonify({'error': 'Invalid alert ID'}), 400
        
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        # Check permission
        if not PermissionService.can_access_alert(user_id, str(alert['user_id'])):
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update alert status
        GuardianAlert.update_status(db, alert_id, 'dismissed')
        
        return jsonify({
            'success': True,
            'message': 'Alert dismissed'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alerts_bp.route('/<alert_id>', methods=['OPTIONS'])
def delete_alert_options(alert_id):
    """Handle CORS preflight for delete"""
    return make_response('', 204)


@alerts_bp.route('/<alert_id>', methods=['DELETE'])
@token_required
def delete_alert(alert_id):
    """Permanently delete an alert"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db
        try:
            alert = db[GuardianAlert.collection_name].find_one({'_id': ObjectId(alert_id)})
        except Exception:
            return jsonify({'error': 'Invalid alert ID'}), 400

        if not alert:
            return jsonify({'error': 'Alert not found'}), 404

        if not PermissionService.can_access_alert(user_id, str(alert['user_id'])):
            return jsonify({'error': 'Unauthorized'}), 403

        db[GuardianAlert.collection_name].delete_one({'_id': ObjectId(alert_id)})
        return jsonify({'success': True, 'message': 'Alert deleted'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@alerts_bp.route('/count/unread', methods=['GET'])
@token_required
def get_unread_alert_count():
    """Get unread alert count"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db
        count = db[GuardianAlert.collection_name].count_documents({
            'user_id': ObjectId(user_id),
            'status': {'$in': ['pending', 'sent']}
        })
        
        return jsonify({
            'success': True,
            'unread_count': count
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
