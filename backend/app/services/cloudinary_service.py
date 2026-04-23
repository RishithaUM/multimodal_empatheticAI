import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
import os


class CloudinaryService:
    """Cloudinary media upload service"""
    
    def __init__(self, cloud_name=None, api_key=None, api_secret=None):
        """Initialize Cloudinary configuration"""
        self.cloud_name = cloud_name or os.getenv('CLOUDINARY_CLOUD_NAME')
        self.api_key = api_key or os.getenv('CLOUDINARY_API_KEY')
        self.api_secret = api_secret or os.getenv('CLOUDINARY_API_SECRET')
        
        if self.cloud_name and self.api_key and self.api_secret:
            cloudinary.config(
                cloud_name=self.cloud_name,
                api_key=self.api_key,
                api_secret=self.api_secret
            )
    
    def upload_image(self, file_path, folder='emotion/images', public_id=None):
        """Upload image to Cloudinary"""
        try:
            result = cloudinary.uploader.upload(
                file_path,
                folder=folder,
                public_id=public_id,
                resource_type='image',
                format='jpg'
            )
            return {
                'success': True,
                'public_id': result['public_id'],
                'url': result['secure_url'],
                'width': result['width'],
                'height': result['height']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_audio(self, file_path, folder='emotion/audio', public_id=None):
        """Upload audio to Cloudinary"""
        try:
            result = cloudinary.uploader.upload(
                file_path,
                folder=folder,
                public_id=public_id,
                resource_type='auto'
            )
            return {
                'success': True,
                'public_id': result['public_id'],
                'url': result['secure_url'],
                'duration': result.get('duration', None)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_from_buffer(self, buffer_data, resource_type='image', folder='emotion', public_id=None):
        """Upload from file buffer"""
        try:
            result = cloudinary.uploader.upload(
                buffer_data,
                folder=folder,
                public_id=public_id,
                resource_type=resource_type
            )
            return {
                'success': True,
                'public_id': result['public_id'],
                'url': result['secure_url']
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_resource(self, public_id):
        """Delete resource from Cloudinary"""
        try:
            result = cloudinary.uploader.destroy(public_id)
            return {
                'success': result.get('result') == 'ok',
                'result': result.get('result')
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_resource_metadata(self, public_id):
        """Get resource metadata"""
        try:
            result = cloudinary.api.resource(public_id)
            return {
                'success': True,
                'data': {
                    'size': result['bytes'],
                    'width': result.get('width'),
                    'height': result.get('height'),
                    'format': result['format'],
                    'created_at': result['created_at']
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def optimize_image(self, public_id, width=None, height=None, quality='auto'):
        """Get optimized image URL"""
        try:
            url, options = cloudinary_url(
                public_id,
                width=width,
                height=height,
                crop='fill',
                quality=quality,
                fetch_format='auto'
            )
            return {
                'success': True,
                'url': url
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
