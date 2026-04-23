from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
import os

class Database:
    """MongoDB database connection handler"""
    _instance = None
    _client = None
    _db = None
    
    @classmethod
    def connect(cls, mongodb_uri=None, db_name=None):
        """Connect to MongoDB"""
        if cls._client is None:
            uri = mongodb_uri or os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
            db_name = db_name or os.getenv('MONGODB_DB', 'emotion_detection')
            
            cls._client = MongoClient(uri)
            cls._db = cls._client[db_name]
            
            # Create indexes
            cls._create_indexes()
        
        return cls._db
    
    @classmethod
    def _create_indexes(cls):
        """Create database indexes for optimization"""
        if cls._db is None:
            return
        
        # User collection indexes
        cls._db.users.create_index('email', unique=True)
        cls._db.users.create_index('username', unique=True)
        
        # Emotion records indexes
        cls._db.emotions.create_index('user_id')
        cls._db.emotions.create_index('created_at')
        cls._db.emotions.create_index([('user_id', 1), ('created_at', -1)])
        
        # Guardian alerts indexes
        cls._db.alerts.create_index('user_id')
        cls._db.alerts.create_index('created_at')
        cls._db.alerts.create_index('status')
        
        # Settings indexes
        cls._db.settings.create_index('user_id', unique=True)
        
        # Media indexes
        cls._db.media.create_index('user_id')
        cls._db.media.create_index('created_at')
    
    @classmethod
    def get_db(cls):
        """Get database instance"""
        if cls._db is None:
            cls.connect()
        return cls._db
    
    @classmethod
    def close(cls):
        """Close database connection"""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None


class User:
    """User model"""
    collection_name = 'users'
    
    @staticmethod
    def create(db, email, username, password_hash, guardian_email=None):
        """Create a new user"""
        user_doc = {
            'email': email,
            'username': username,
            'password_hash': password_hash,
            'guardian_email': guardian_email,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'is_active': True,
            'preferences': {
                'language': 'en',
                'timezone': 'UTC',
                'notifications_enabled': True
            }
        }
        result = db[User.collection_name].insert_one(user_doc)
        return result.inserted_id
    
    @staticmethod
    def get_by_email(db, email):
        """Get user by email"""
        return db[User.collection_name].find_one({'email': email})
    
    @staticmethod
    def get_by_username(db, username):
        """Get user by username"""
        return db[User.collection_name].find_one({'username': username})
    
    @staticmethod
    def get_by_id(db, user_id):
        """Get user by ID"""
        return db[User.collection_name].find_one({'_id': ObjectId(user_id)})
    
    @staticmethod
    def update(db, user_id, update_dict):
        """Update user"""
        update_dict['updated_at'] = datetime.utcnow()
        result = db[User.collection_name].update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_dict}
        )
        return result.modified_count > 0


class EmotionRecord:
    """Emotion detection record model"""
    collection_name = 'emotions'
    
    @staticmethod
    def create(db, user_id, emotion_data):
        """Create emotion record"""
        record = {
            'user_id': ObjectId(user_id),
            'emotion': emotion_data.get('emotion'),
            'confidence': emotion_data.get('confidence'),
            'intensity': emotion_data.get('intensity'),
            'intensity_label': emotion_data.get('intensity_label'),
            'modalities': emotion_data.get('modalities', {}),
            'fusion_weights': emotion_data.get('fusion_weights', {}),
            'metadata': emotion_data.get('metadata', {}),
            'image_url': emotion_data.get('image_url'),
            'audio_url': emotion_data.get('audio_url'),
            'created_at': datetime.utcnow(),
            'processed_at': datetime.utcnow()
        }
        result = db[EmotionRecord.collection_name].insert_one(record)
        return result.inserted_id
    
    @staticmethod
    def get_user_history(db, user_id, limit=50):
        """Get user emotion history"""
        return list(db[EmotionRecord.collection_name].find(
            {'user_id': ObjectId(user_id)}
        ).sort('created_at', -1).limit(limit))
    
    @staticmethod
    def get_by_id(db, record_id):
        """Get emotion record by ID"""
        return db[EmotionRecord.collection_name].find_one({'_id': ObjectId(record_id)})


class GuardianAlert:
    """Guardian alert model"""
    collection_name = 'alerts'
    
    ALERT_TYPES = ['HIGH_INTENSITY', 'REPEATED_NEGATIVE', 'PROLONGED_DISTRESS']
    SEVERITY_LEVELS = ['warning', 'critical']
    STATUSES = ['pending', 'sent', 'failed', 'dismissed']
    
    @staticmethod
    def create(db, user_id, alert_type, severity, emotion_data, guardian_emails=None):
        """Create guardian alert"""
        alert = {
            'user_id': ObjectId(user_id),
            'alert_type': alert_type,
            'severity': severity,
            'emotion_data': emotion_data,
            'guardian_emails': guardian_emails or [],
            'status': 'pending',
            'sent_at': None,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = db[GuardianAlert.collection_name].insert_one(alert)
        return result.inserted_id
    
    @staticmethod
    def get_pending(db, limit=50):
        """Get pending alerts"""
        return list(db[GuardianAlert.collection_name].find(
            {'status': 'pending'}
        ).limit(limit))
    
    @staticmethod
    def update_status(db, alert_id, status, sent_at=None):
        """Update alert status"""
        update_dict = {
            'status': status,
            'updated_at': datetime.utcnow()
        }
        if sent_at:
            update_dict['sent_at'] = sent_at
        
        result = db[GuardianAlert.collection_name].update_one(
            {'_id': ObjectId(alert_id)},
            {'$set': update_dict}
        )
        return result.modified_count > 0


class UserSettings:
    """User settings model"""
    collection_name = 'settings'
    
    @staticmethod
    def create(db, user_id):
        """Create default user settings"""
        settings = {
            'user_id': ObjectId(user_id),
            'guardian_emails': [],
            'alerts_enabled': True,
            'face_detection_enabled': True,
            'voice_analysis_enabled': True,
            'text_analysis_enabled': True,
            'data_storage_enabled': True,
            'email_notifications_enabled': True,
            'websocket_url': 'ws://localhost:5000',
            'emotion_sensitivity': 'medium',  # low, medium, high
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        result = db[UserSettings.collection_name].insert_one(settings)
        return result.inserted_id
    
    @staticmethod
    def get_by_user_id(db, user_id):
        """Get settings by user ID"""
        return db[UserSettings.collection_name].find_one({'user_id': ObjectId(user_id)})
    
    @staticmethod
    def update(db, user_id, settings_dict):
        """Update user settings"""
        settings_dict['updated_at'] = datetime.utcnow()
        result = db[UserSettings.collection_name].update_one(
            {'user_id': ObjectId(user_id)},
            {'$set': settings_dict}
        )
        return result.modified_count > 0


class Media:
    """Media model for Cloudinary uploads"""
    collection_name = 'media'
    
    @staticmethod
    def create(db, user_id, media_data):
        """Create media record"""
        record = {
            'user_id': ObjectId(user_id),
            'type': media_data.get('type'),  # image, audio
            'cloudinary_public_id': media_data.get('cloudinary_public_id'),
            'cloudinary_url': media_data.get('cloudinary_url'),
            'file_name': media_data.get('file_name'),
            'file_size': media_data.get('file_size'),
            'mime_type': media_data.get('mime_type'),
            'emotion_record_id': media_data.get('emotion_record_id'),
            'metadata': media_data.get('metadata', {}),
            'created_at': datetime.utcnow()
        }
        result = db[Media.collection_name].insert_one(record)
        return result.inserted_id
    
    @staticmethod
    def get_by_user_id(db, user_id, limit=50):
        """Get user media"""
        return list(db[Media.collection_name].find(
            {'user_id': ObjectId(user_id)}
        ).sort('created_at', -1).limit(limit))
    
    @staticmethod
    def delete_by_cloudinary_id(db, cloudinary_public_id):
        """Delete media by Cloudinary ID"""
        result = db[Media.collection_name].delete_one(
            {'cloudinary_public_id': cloudinary_public_id}
        )
        return result.deleted_count > 0
