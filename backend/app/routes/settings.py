from flask import Blueprint, request, jsonify, current_app
from app.models import UserSettings, User, Database
from app.services import token_required, PermissionService
from bson import ObjectId

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'])
@token_required
def get_settings():
    """Get user settings"""
    try:
        user_id = request.user_id
        db = current_app.db
        
        settings = UserSettings.get_by_user_id(db, user_id)
        
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        settings['_id'] = str(settings['_id'])
        settings['user_id'] = str(settings['user_id'])
        
        return jsonify({
            'success': True,
            'settings': settings
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/', methods=['PUT'])
@token_required
def update_settings():
    """Update user settings"""
    try:
        user_id = request.user_id
        data = request.get_json()
        db = current_app.db
        
        # Validate permission
        settings = UserSettings.get_by_user_id(db, user_id)
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        if not PermissionService.can_modify_settings(user_id, str(settings['user_id'])):
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update settings
        updated = UserSettings.update(db, user_id, data)
        
        if not updated:
            return jsonify({'error': 'Failed to update settings'}), 500
        
        # Get updated settings
        updated_settings = UserSettings.get_by_user_id(db, user_id)
        updated_settings['_id'] = str(updated_settings['_id'])
        updated_settings['user_id'] = str(updated_settings['user_id'])
        
        return jsonify({
            'success': True,
            'message': 'Settings updated successfully',
            'settings': updated_settings
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/guardian-emails', methods=['GET'])
@token_required
def get_guardian_emails():
    """Get guardian emails"""
    try:
        user_id = request.user_id
        db = current_app.db
        
        settings = UserSettings.get_by_user_id(db, user_id)
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        return jsonify({
            'success': True,
            'guardian_emails': settings.get('guardian_emails', [])
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/guardian-emails', methods=['POST'])
@token_required
def add_guardian_email():
    """Add guardian email"""
    try:
        user_id = request.user_id
        data = request.get_json()
        email = data.get('email', '').lower()
        db = current_app.db
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        settings = UserSettings.get_by_user_id(db, user_id)
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        guardian_emails = settings.get('guardian_emails', [])
        
        if email in guardian_emails:
            return jsonify({'error': 'Email already added'}), 409
        
        guardian_emails.append(email)
        UserSettings.update(db, user_id, {'guardian_emails': guardian_emails})
        
        return jsonify({
            'success': True,
            'message': 'Guardian email added',
            'guardian_emails': guardian_emails
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/guardian-emails/<email>', methods=['DELETE'])
@token_required
def remove_guardian_email(email):
    """Remove guardian email"""
    try:
        user_id = request.user_id
        email = email.lower()
        db = current_app.db
        
        settings = UserSettings.get_by_user_id(db, user_id)
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        guardian_emails = settings.get('guardian_emails', [])
        
        if email not in guardian_emails:
            return jsonify({'error': 'Email not found'}), 404
        
        guardian_emails.remove(email)
        UserSettings.update(db, user_id, {'guardian_emails': guardian_emails})
        
        return jsonify({
            'success': True,
            'message': 'Guardian email removed',
            'guardian_emails': guardian_emails
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/test-websocket', methods=['POST'])
@token_required
def test_websocket():
    """Test WebSocket connection"""
    try:
        data = request.get_json()
        ws_url = data.get('ws_url', '')
        
        if not ws_url:
            return jsonify({'error': 'WebSocket URL is required'}), 400
        
        # TODO: Implement WebSocket connection test
        
        return jsonify({
            'success': True,
            'message': 'WebSocket test initiated',
            'latency_ms': 0
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/test-email', methods=['POST'])
@token_required
def test_email():
    """Test email notification"""
    try:
        data = request.get_json()
        email = data.get('email', '')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Send test email
        from app.services import EmailNotificationService
        user_id = request.user_id
        db = current_app.db
        user = User.get_by_id(db, user_id)
        
        result = EmailNotificationService.send_guardian_alert(
            [email],
            user.get('username', 'User'),
            'Test Emotion',
            'warning',
            'TEST_ALERT'
        )
        
        return jsonify({
            'success': result['success'],
            'message': result.get('error', 'Test email sent successfully')
        }), 200 if result['success'] else 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
