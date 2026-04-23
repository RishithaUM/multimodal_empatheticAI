from flask import Blueprint, request, jsonify, current_app
from app.models import GuardianAlert, User, Database
from app.services import token_required, PermissionService, EmailNotificationService
from datetime import datetime

alerts_bp = Blueprint('alerts', __name__)


@alerts_bp.route('/create', methods=['POST'])
@token_required
def create_alert():
    """Create guardian alert"""
    try:
        data = request.get_json()
        user_id = request.user_id
        db = current_app.db
        
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
        if guardian_emails and current_app.config['EMAIL_FROM_ADDRESS']:
            email_result = EmailNotificationService.send_guardian_alert(
                guardian_emails,
                user.get('username', 'User'),
                emotion_data.get('emotion', 'Unknown'),
                severity,
                alert_type
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
        user_id = request.user_id
        limit = request.args.get('limit', 50, type=int)
        status = request.args.get('status')
        
        db = current_app.db
        
        query = {'user_id': ObjectId(user_id)}
        if status:
            query['status'] = status
        
        alerts = list(db[GuardianAlert.collection_name].find(query).sort('created_at', -1).limit(limit))
        
        # Convert ObjectIds to strings
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


@alerts_bp.route('/pending', methods=['GET'])
@token_required
def get_pending_alerts():
    """Get pending alerts for all users (admin only)"""
    try:
        db = current_app.db
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
        user_id = request.user_id
        db = current_app.db
        
        from bson import ObjectId
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


@alerts_bp.route('/count/unread', methods=['GET'])
@token_required
def get_unread_alert_count():
    """Get unread alert count"""
    try:
        user_id = request.user_id
        db = current_app.db
        from bson import ObjectId
        
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
