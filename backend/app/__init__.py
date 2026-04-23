from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from app.config import config_by_name
from app.models import Database
from app.services import EmotionAnalysisService
import os


def create_app(config_name='development'):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    config = config_by_name.get(config_name, 'development')
    app.config.from_object(config)
    
    # Initialize MongoDB
    db = Database.connect(
        mongodb_uri=app.config['MONGODB_URI'],
        db_name=app.config['MONGODB_DB']
    )
    app.db = db
    
    # Initialize CORS
    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})
    
    # Initialize SocketIO
    socketio = SocketIO(
        app,
        cors_allowed_origins=app.config['CORS_ORIGINS'],
        ping_timeout=app.config['SOCKETIO_PING_TIMEOUT'],
        ping_interval=app.config['SOCKETIO_PING_INTERVAL']
    )
    app.socketio = socketio
    
    # Initialize Emotion Analysis Service
    emotion_service = EmotionAnalysisService(max_history=app.config['MAX_EMOTION_HISTORY'])
    app.emotion_service = emotion_service
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Register WebSocket events
    _register_websocket_events(app, socketio)
    
    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        from flask import jsonify
        return jsonify({
            'status': 'healthy',
            'service': 'EmpathAI Backend',
            'version': '1.0.0'
        })
    
    return app, socketio


def _register_error_handlers(app):
    """Register error handlers"""
    from flask import jsonify
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request'}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500


def _register_blueprints(app):
    """Register Flask blueprints"""
    from app.routes import auth_bp, emotion_bp, alerts_bp, settings_bp, media_bp, chat_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(emotion_bp, url_prefix='/api/emotion')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(media_bp, url_prefix='/api/media')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')


def _register_websocket_events(app, socketio):
    """Register WebSocket event handlers"""
    from flask_socketio import emit, join_room, leave_room
    
    # Dictionary to track connected clients
    connected_clients = {}
    
    @socketio.on('connect')
    def handle_connect():
        from flask_socketio import request
        user_id = request.args.get('user_id')
        
        if user_id:
            connected_clients[request.sid] = user_id
            join_room(f'user_{user_id}')
            emit('connection_response', {
                'status': 'connected',
                'message': 'Connected to emotion stream'
            })
    
    @socketio.on('disconnect')
    def handle_disconnect():
        from flask_socketio import request
        if request.sid in connected_clients:
            del connected_clients[request.sid]
        emit('disconnected', {'message': 'Disconnected from server'})
    
    @socketio.on('subscribe_emotion_stream')
    def handle_subscribe(data):
        from flask_socketio import request
        user_id = data.get('user_id')
        if user_id:
            join_room(f'user_{user_id}')
            emit('subscribed', {
                'status': 'subscribed',
                'user_id': user_id
            })
    
    @socketio.on('ping')
    def handle_ping():
        emit('pong', {'message': 'pong'})
    
    # Broadcast emotion to client
    def broadcast_emotion(user_id, emotion_data):
        """Broadcast emotion to specific user"""
        socketio.emit('emotion_detected', emotion_data, room=f'user_{user_id}')
