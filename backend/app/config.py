import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', False)
    TESTING = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_EXPIRATION = timedelta(hours=int(os.getenv('JWT_EXPIRATION_HOURS', 24)))
    
    # MongoDB Configuration
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    MONGODB_DB = os.getenv('MONGODB_DB', 'emotion_detection')
    
    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET')
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
    
    # SocketIO Configuration
    SOCKETIO_MESSAGE_QUEUE = os.getenv('SOCKETIO_MESSAGE_QUEUE', None)
    SOCKETIO_PING_TIMEOUT = int(os.getenv('SOCKETIO_PING_TIMEOUT', 60))
    SOCKETIO_PING_INTERVAL = int(os.getenv('SOCKETIO_PING_INTERVAL', 25))
    
    # Email Configuration
    EMAIL_SERVICE_PROVIDER = os.getenv('EMAIL_SERVICE_PROVIDER', 'gmail')
    EMAIL_FROM_ADDRESS = os.getenv('EMAIL_FROM_ADDRESS')
    EMAIL_API_KEY = os.getenv('EMAIL_API_KEY')
    SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
    
    # ML Model Configuration
    MODEL_DEVICE = os.getenv('MODEL_DEVICE', 'cpu')
    MODEL_PRECISION = os.getenv('MODEL_PRECISION', 'fp32')
    FACE_DETECTION_MODEL = os.getenv('FACE_DETECTION_MODEL', 'resnet50')
    VOICE_EMOTION_MODEL = os.getenv('VOICE_EMOTION_MODEL', 'kvilla')
    TEXT_EMOTION_MODEL = os.getenv('TEXT_EMOTION_MODEL', 'ollama')
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
    OLLAMA_TEXT_MODEL = os.getenv('OLLAMA_TEXT_MODEL', 'llama3.2:1b')
    OLLAMA_TIMEOUT_SECONDS = int(os.getenv('OLLAMA_TIMEOUT_SECONDS', 30))
    
    # Feature Flags
    ENABLE_EMOTION_FUSION = os.getenv('ENABLE_EMOTION_FUSION', 'true').lower() == 'true'
    ENABLE_DISTRESS_DETECTION = os.getenv('ENABLE_DISTRESS_DETECTION', 'true').lower() == 'true'
    ENABLE_REAL_TIME_STREAMING = os.getenv('ENABLE_REAL_TIME_STREAMING', 'true').lower() == 'true'
    
    # Cache Configuration
    MAX_EMOTION_HISTORY = int(os.getenv('MAX_EMOTION_HISTORY', 200))
    EMOTION_CACHE_TTL = int(os.getenv('EMOTION_CACHE_TTL', 300))


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MONGODB_DB = 'emotion_detection_test'
    JWT_EXPIRATION = timedelta(hours=1)


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
