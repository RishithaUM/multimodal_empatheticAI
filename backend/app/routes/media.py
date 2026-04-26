from flask import Blueprint, request, jsonify, current_app
from app.models import Media, Database
from app.services import token_required, CloudinaryService, PermissionService
from werkzeug.utils import secure_filename
import os
from bson import ObjectId

media_bp = Blueprint('media', __name__)

from typing import cast
from app import AppFlask

def _app() -> AppFlask:
    return cast(AppFlask, current_app._get_current_object())  # type: ignore[attr-defined]

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'flac', 'm4a', 'ogg'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def allowed_file(filename, allowed_extensions):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def get_file_size(file_obj):
    """Get file size"""
    file_obj.seek(0, 2)
    size = file_obj.tell()
    file_obj.seek(0)
    return size


@media_bp.route('/upload-image', methods=['POST'])
@token_required
def upload_image():
    """Upload image to Cloudinary"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        emotion_record_id = request.form.get('emotion_record_id')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Check file size
        file_size = get_file_size(file)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large (max 50MB)'}), 413
        
        # Upload to Cloudinary
        cloudinary_service = CloudinaryService()
        result = cloudinary_service.upload_from_buffer(
            file.stream,
            resource_type='image',
            folder='emotion/images',
            public_id=f'user_{user_id}_{os.urandom(8).hex()}'
        )
        
        if not result['success']:
            return jsonify({'error': result.get('error', 'Upload failed')}), 500
        
        # Create media record
        db = _app().db
        media_data = {
            'type': 'image',
            'cloudinary_public_id': result['public_id'],
            'cloudinary_url': result['url'],
            'file_name': secure_filename(file.filename),
            'file_size': file_size,
            'mime_type': file.content_type,
            'emotion_record_id': emotion_record_id,
            'metadata': {}
        }
        
        media_id = Media.create(db, user_id, media_data)
        
        return jsonify({
            'success': True,
            'media_id': str(media_id),
            'url': result['url'],
            'public_id': result['public_id']
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@media_bp.route('/upload-audio', methods=['POST'])
@token_required
def upload_audio():
    """Upload audio to Cloudinary"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        emotion_record_id = request.form.get('emotion_record_id')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename, ALLOWED_AUDIO_EXTENSIONS):
            return jsonify({'error': 'Invalid audio format'}), 400
        
        # Check file size
        file_size = get_file_size(file)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File too large (max 50MB)'}), 413
        
        # Upload to Cloudinary
        cloudinary_service = CloudinaryService()
        result = cloudinary_service.upload_from_buffer(
            file.stream,
            resource_type='auto',
            folder='emotion/audio',
            public_id=f'user_{user_id}_{os.urandom(8).hex()}'
        )
        
        if not result['success']:
            return jsonify({'error': result.get('error', 'Upload failed')}), 500
        
        # Create media record
        db = _app().db
        media_data = {
            'type': 'audio',
            'cloudinary_public_id': result['public_id'],
            'cloudinary_url': result['url'],
            'file_name': secure_filename(file.filename),
            'file_size': file_size,
            'mime_type': file.content_type,
            'emotion_record_id': emotion_record_id,
            'metadata': {}
        }
        
        media_id = Media.create(db, user_id, media_data)
        
        return jsonify({
            'success': True,
            'media_id': str(media_id),
            'url': result['url'],
            'public_id': result['public_id']
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@media_bp.route('/list', methods=['GET'])
@token_required
def list_media():
    """List user media"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        limit = request.args.get('limit', 50, type=int)
        media_type = request.args.get('type')  # 'image' or 'audio'
        
        db = _app().db
        media_list = Media.get_by_user_id(db, user_id, limit=limit)
        
        # Filter by type if specified
        if media_type:
            media_list = [m for m in media_list if m['type'] == media_type]
        
        # Convert ObjectIds to strings
        for media in media_list:
            media['_id'] = str(media['_id'])
            media['user_id'] = str(media['user_id'])
            if media.get('emotion_record_id'):
                media['emotion_record_id'] = str(media['emotion_record_id'])
        
        return jsonify({
            'success': True,
            'count': len(media_list),
            'media': media_list
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@media_bp.route('/<media_id>', methods=['DELETE'])
@token_required
def delete_media(media_id):
    """Delete media"""
    try:
        user_id = request.user_id  # type: ignore[attr-defined]
        db = _app().db
        
        try:
            media = db[Media.collection_name].find_one({'_id': ObjectId(media_id)})
        except:
            return jsonify({'error': 'Invalid media ID'}), 400
        
        if not media:
            return jsonify({'error': 'Media not found'}), 404
        
        # Check permission
        if not PermissionService.is_owner(user_id, str(media['user_id'])):
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Delete from Cloudinary
        cloudinary_service = CloudinaryService()
        delete_result = cloudinary_service.delete_resource(media['cloudinary_public_id'])
        
        # Delete from database
        Media.delete_by_cloudinary_id(db, media['cloudinary_public_id'])
        
        return jsonify({
            'success': True,
            'message': 'Media deleted successfully'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
