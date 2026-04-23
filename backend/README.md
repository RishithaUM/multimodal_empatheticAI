# EmpathAI Backend

A comprehensive Flask-based backend for multimodal emotion detection system featuring real-time WebSocket streaming, MongoDB persistence, Cloudinary media storage, and advanced ML models.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── config.py                # Configuration management
│   ├── models/
│   │   ├── database.py          # MongoDB models
│   │   └── __init__.py
│   ├── routes/
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── emotion.py           # Emotion analysis endpoints
│   │   ├── alerts.py            # Guardian alerts endpoints
│   │   ├── settings.py          # User settings endpoints
│   │   ├── media.py             # Media upload endpoints
│   │   ├── chat.py              # Chat engine endpoints
│   │   └── __init__.py
│   ├── services/
│   │   ├── auth_service.py      # JWT & password hashing
│   │   ├── cloudinary_service.py# Cloudinary integration
│   │   ├── email_service.py     # Email notifications
│   │   ├── emotion_analysis.py  # Emotion fusion & alerts
│   │   └── __init__.py
│   └── utils/                   # Utility functions
│
├── ml_models/
│   ├── model_manager.py         # Unified model coordinator
│   ├── face/
│   │   └── face_emotion_cnn.py  # CNN face emotion detection
│   ├── voice/
│   │   └── voice_emotion_bilstm.py  # BiLSTM voice analysis
│   ├── text/
│   │   └── text_emotion_transformer.py  # Transformer text emotion
│   └── __init__.py
│
├── run.py                       # Main entry point
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
└── README.md
```

## Features

### 1. **Multimodal Emotion Detection**
- **Face Recognition**: CNN-based facial emotion detection
- **Voice Analysis**: BiLSTM temporal emotion analysis
- **Text Analysis**: Transformer-based NLP emotion detection
- **Multimodal Fusion**: Weighted combination with cross-modal attention

### 2. **Real-Time Streaming**
- WebSocket support for live emotion streaming
- Connection management and automatic reconnection
- Room-based broadcasting per user

### 3. **Data Management**
- MongoDB integration for persistent storage
- Emotion history tracking (configurable retention)
- User preferences and settings
- Guardian alert history

### 4. **Media Handling**
- Cloudinary integration for image/audio uploads
- Automatic optimization and transcoding
- Secure file access and cleanup

### 5. **Authentication & Security**
- JWT token-based authentication
- Bcrypt password hashing
- Role-based access control
- Token refresh mechanism

### 6. **Guardian Alerts**
- Distress detection with configurable thresholds
- Email notifications via Gmail/SendGrid/AWS SES
- Alert history and dismissal tracking
- Severity levels (warning/critical)

### 7. **Chat Engine**
- Emotion-aware response generation
- Content recommendations by emotion
- Quick replies and affirmations
- Context-aware conversation flow

## Installation

### Prerequisites
- Python 3.8+
- MongoDB 4.4+
- Git

### Setup

1. **Clone repository**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/Scripts/activate  # On Windows
# or
source venv/bin/activate      # On macOS/Linux
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run development server**
```bash
python run.py
```

Server starts at `http://localhost:5000`

## Configuration

### Essential Environment Variables

```env
# Flask
FLASK_ENV=development
SECRET_KEY=your_secret_key_here

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/emotion_detection
MONGODB_DB=emotion_detection

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET_KEY=your_jwt_secret

# Email (Gmail example)
EMAIL_SERVICE_PROVIDER=gmail
EMAIL_FROM_ADDRESS=your_email@gmail.com
EMAIL_API_KEY=your_app_password
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh JWT
- `POST /api/auth/verify-token` - Verify token

### Emotion Analysis
- `POST /api/emotion/analyze` - Analyze multimodal emotion
- `GET /api/emotion/history` - Get emotion history
- `GET /api/emotion/record/<id>` - Get emotion record
- `GET /api/emotion/stats` - Get emotion statistics

### Guardian Alerts
- `POST /api/alerts/create` - Create alert
- `GET /api/alerts/history` - Get alert history
- `PUT /api/alerts/<id>/dismiss` - Dismiss alert
- `GET /api/alerts/count/unread` - Get unread count

### Settings
- `GET /api/settings/` - Get user settings
- `PUT /api/settings/` - Update settings
- `POST /api/settings/guardian-emails` - Add guardian email
- `DELETE /api/settings/guardian-emails/<email>` - Remove guardian

### Media
- `POST /api/media/upload-image` - Upload image
- `POST /api/media/upload-audio` - Upload audio
- `GET /api/media/list` - List user media
- `DELETE /api/media/<id>` - Delete media

### Chat
- `POST /api/chat/send-message` - Send chat message
- `POST /api/chat/get-recommendations` - Get recommendations
- `GET /api/chat/quick-replies` - Get quick replies
- `GET /api/chat/affirmations` - Get affirmations

## ML Models

### Face Emotion CNN
```python
from ml_models import get_model_manager

manager = get_model_manager(device='cuda')
result = manager.detect_face_emotion('image.jpg')
# Returns: {'emotion': 'happy', 'confidence': 0.95, ...}
```

### Voice Emotion BiLSTM
```python
result = manager.detect_voice_emotion('audio.wav')
# Returns: {'emotion': 'sad', 'confidence': 0.87, ...}
```

### Text Emotion Transformer
```python
result = manager.detect_text_emotion("I'm feeling great!")
# Returns: {'emotion': 'joy', 'confidence': 0.92, ...}
```

### Multimodal Fusion
```python
face = manager.detect_face_emotion(image)
voice = manager.detect_voice_emotion(audio)
text = manager.detect_text_emotion(message)

fused = manager.fuse_emotions(face, voice, text)
# Returns: {'fused_emotion': 'happy', 'fused_confidence': 0.91, ...}
```

## WebSocket Events

### Client → Server
```javascript
socket.emit('subscribe_emotion_stream', { user_id: 'user123' });
socket.emit('ping');
```

### Server → Client
```javascript
socket.on('emotion_detected', (data) => {
  // { emotion_record_id, fused_result }
});

socket.on('emotion_with_alert', (data) => {
  // { emotion_record_id, fused_result, alerts }
});
```

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **CORS**: Configure proper CORS origins
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Input Validation**: All inputs are validated and sanitized
5. **Database**: Use connection string authentication with IP whitelisting
6. **API Keys**: Rotate keys regularly
7. **WebSocket**: Validate user identity before allowing subscriptions

## Performance Optimization

1. **GPU Support**: Enable CUDA for ML inference
2. **Model Caching**: Models are loaded once and reused
3. **Emotion History**: Limited to 200 entries per user
4. **Database Indexes**: Optimized queries with indexes
5. **Media Optimization**: Cloudinary handles image/audio optimization

## Deployment

### Docker
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "run.py"]
```

### Gunicorn + Nginx
```bash
gunicorn --worker-class eventlet -w 1 run:app
```

## Testing

```bash
# Run tests
pytest tests/

# With coverage
pytest --cov=app tests/
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB Atlas IP whitelist includes your server
- Verify connection string format
- Check database user permissions

### Cloudinary Upload Failures
- Verify API credentials
- Check file size limits (50MB max)
- Ensure file format is supported

### ML Model Loading
- For GPU: Install `torch` with CUDA support
- For CPU: Works out of the box
- Download models on first run (requires internet)

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add new feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Create Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [EmpathAI/issues](https://github.com/empathAI/issues)
- Documentation: [EmpathAI Docs](https://docs.empathAI.com)
- Email: support@empathAI.com
