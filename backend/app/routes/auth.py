from flask import Blueprint, request, jsonify, current_app
from typing import cast
from app import AppFlask
from app.models import User, UserSettings, Database
from app.services import AuthService, token_required
from email_validator import validate_email, EmailNotValidError
import re

auth_bp = Blueprint('auth', __name__)

def _app() -> AppFlask:
    return cast(AppFlask, current_app._get_current_object())  # type: ignore[attr-defined]


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all([data.get('email'), data.get('username'), data.get('password')]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        email = data['email'].lower()
        username = data['username']
        password = data['password']
        guardian_email = data.get('guardian_email', '').lower()
        
        # Validate email
        try:
            validate_email(email)
        except EmailNotValidError:
            return jsonify({'error': 'Invalid email address'}), 400
        
        # Validate username (3-20 characters, alphanumeric + underscore)
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
            return jsonify({'error': 'Username must be 3-20 characters, alphanumeric + underscore'}), 400
        
        # Validate password (minimum 8 characters)
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        db = _app().db
        
        # Check if email already exists
        if User.get_by_email(db, email):
            return jsonify({'error': 'Email already registered'}), 409
        
        # Check if username already exists
        if User.get_by_username(db, username):
            return jsonify({'error': 'Username already taken'}), 409
        
        # Hash password
        password_hash = AuthService.hash_password(password)
        
        # Create user
        user_id = User.create(db, email, username, password_hash, guardian_email)
        
        # Create default settings (seed guardian_email from signup if provided)
        UserSettings.create(db, user_id)
        if guardian_email:
            from app.models.database import UserSettings as US
            US.update(db, user_id, {'guardian_emails': [guardian_email]})
        
        # Generate token
        token_result = AuthService.generate_token(user_id, email)
        
        if not token_result['success']:
            return jsonify({'error': 'Failed to generate token'}), 500
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user_id': str(user_id),
            'token': token_result['token'],
            'expires_in': token_result['expires_in']
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not all([data.get('email'), data.get('password')]):
            return jsonify({'error': 'Missing email or password'}), 400
        
        email = data['email'].lower()
        password = data['password']
        
        db = _app().db
        user = User.get_by_email(db, email)
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Verify password
        if not AuthService.verify_password(password, user['password_hash']):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check if user is active
        if not user.get('is_active', True):
            return jsonify({'error': 'User account is inactive'}), 403
        
        # Generate token
        token_result = AuthService.generate_token(str(user['_id']), user['email'])
        
        if not token_result['success']:
            return jsonify({'error': 'Failed to generate token'}), 500
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user_id': str(user['_id']),
            'email': user['email'],
            'username': user['username'],
            'token': token_result['token'],
            'expires_in': token_result['expires_in']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    """Return current authenticated user info"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db
        user = User.get_by_id(db, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({
            'success': True,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'username': user['username'],
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['PUT'])
@token_required
def update_me():
    """Update current authenticated user profile fields"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        data = request.get_json() or {}
        db = _app().db

        user = User.get_by_id(db, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        update_dict = {}

        if 'username' in data:
            username = str(data.get('username', '')).strip()
            if not username:
                return jsonify({'error': 'Username cannot be empty'}), 400
            if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
                return jsonify({'error': 'Username must be 3-20 characters, alphanumeric + underscore'}), 400

            existing = User.get_by_username(db, username)
            if existing and str(existing.get('_id')) != str(user['_id']):
                return jsonify({'error': 'Username already taken'}), 409
            update_dict['username'] = username

        if 'email' in data:
            email = str(data.get('email', '')).strip().lower()
            if not email:
                return jsonify({'error': 'Email cannot be empty'}), 400
            try:
                validate_email(email)
            except EmailNotValidError:
                return jsonify({'error': 'Invalid email address'}), 400

            existing = User.get_by_email(db, email)
            if existing and str(existing.get('_id')) != str(user['_id']):
                return jsonify({'error': 'Email already registered'}), 409
            update_dict['email'] = email

        if not update_dict:
            return jsonify({'error': 'No fields to update'}), 400

        updated = User.update(db, user_id, update_dict)
        if not updated:
            return jsonify({'error': 'Failed to update user'}), 500

        refreshed = User.get_by_id(db, user_id)
        if not refreshed:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'success': True,
            'user': {
                'id': str(refreshed['_id']),
                'email': refreshed['email'],
                'username': refreshed['username'],
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/refresh-token', methods=['POST'])
def refresh_token():
    """Refresh JWT token"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        refresh_result = AuthService.refresh_token(token)
        
        if not refresh_result['success']:
            return jsonify({'error': refresh_result['error']}), 401
        
        return jsonify({
            'success': True,
            'token': refresh_result['token'],
            'expires_in': refresh_result['expires_in']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        result = AuthService.verify_token(token)
        
        if not result['success']:
            return jsonify({'error': result['error']}), 401
        
        return jsonify({
            'success': True,
            'user_id': result['data']['user_id'],
            'email': result['data']['email']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
