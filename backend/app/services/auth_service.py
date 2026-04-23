import jwt
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
import os


class AuthService:
    """Authentication service with JWT and password hashing"""
    
    @staticmethod
    def hash_password(password):
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password, hashed_password):
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            return False
    
    @staticmethod
    def generate_token(user_id, email, expires_in_hours=24):
        """Generate JWT token"""
        try:
            payload = {
                'user_id': str(user_id),
                'email': email,
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=expires_in_hours)
            }
            token = jwt.encode(
                payload,
                current_app.config['JWT_SECRET_KEY'],
                algorithm=current_app.config['JWT_ALGORITHM']
            )
            return {
                'success': True,
                'token': token,
                'expires_in': expires_in_hours * 3600
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def verify_token(token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=[current_app.config['JWT_ALGORITHM']]
            )
            return {
                'success': True,
                'data': payload
            }
        except jwt.ExpiredSignatureError:
            return {
                'success': False,
                'error': 'Token expired'
            }
        except jwt.InvalidTokenError:
            return {
                'success': False,
                'error': 'Invalid token'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def refresh_token(token):
        """Refresh JWT token"""
        result = AuthService.verify_token(token)
        if not result['success']:
            return result
        
        user_id = result['data']['user_id']
        email = result['data']['email']
        
        return AuthService.generate_token(user_id, email)


def token_required(f):
    """Decorator for protecting routes that require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Verify token
        result = AuthService.verify_token(token)
        if not result['success']:
            return jsonify({'error': result['error']}), 401
        
        # Pass user data to the route
        request.user_id = result['data']['user_id']
        request.email = result['data']['email']
        
        return f(*args, **kwargs)
    
    return decorated


class PermissionService:
    """Service for checking user permissions"""
    
    @staticmethod
    def is_owner(user_id, resource_user_id):
        """Check if user owns the resource"""
        return str(user_id) == str(resource_user_id)
    
    @staticmethod
    def can_access_alert(user_id, alert_user_id):
        """Check if user can access alert"""
        return str(user_id) == str(alert_user_id)
    
    @staticmethod
    def can_modify_settings(user_id, settings_user_id):
        """Check if user can modify settings"""
        return str(user_id) == str(settings_user_id)
