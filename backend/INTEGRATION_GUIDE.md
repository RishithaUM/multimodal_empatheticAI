# Frontend-Backend Integration Guide

## Overview

This document describes the complete integration between the React frontend and Flask backend for the EmpathAI emotion detection system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Components & Pages                                  │   │
│  │  - Dashboard, Analyze, Chat, Results                 │   │
│  └──────────────────────────────────────────────────────┘   │
│              │                    │                           │
│              ↓                    ↓                           │
│  ┌──────────────────┐  ┌────────────────────┐              │
│  │ Hooks/Services   │  │ WebSocket Events   │              │
│  │ - useEmotion...  │  │ - emotion_detected │              │
│  │ - useVoice...    │  │ - emotion_with...  │              │
│  │ - useText...     │  │ - connection_...   │              │
│  └──────────────────┘  └────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
              ↓                    ↓
        HTTP (REST)         WebSocket (Real-time)
              ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                   Flask Backend (Python)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/...)                               │   │
│  │  - /auth/*          (JWT authentication)             │   │
│  │  - /emotion/*       (emotion analysis & storage)     │   │
│  │  - /alerts/*        (guardian alerts)                │   │
│  │  - /settings/*      (user preferences)               │   │
│  │  - /media/*         (Cloudinary uploads)             │   │
│  │  - /chat/*          (emotion-aware chat)             │   │
│  └──────────────────────────────────────────────────────┘   │
│              │
│              ↓
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services Layer                                      │   │
│  │  - AuthService (JWT + Bcrypt)                        │   │
│  │  - CloudinaryService (media)                         │   │
│  │  - EmailService (guardian alerts)                    │   │
│  │  - EmotionAnalysisService (fusion + detection)       │   │
│  └──────────────────────────────────────────────────────┘   │
│              │
│              ↓
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────┐  │
│  │  ML Models       │  │  Cloudinary      │  │ MongoDB  │  │
│  │  - Face CNN      │  │  (media storage) │  │ (data)   │  │
│  │  - Voice BiLSTM  │  └──────────────────┘  └──────────┘  │
│  │  - Text Transformer                                   │   │
│  └──────────────────┘                                     │   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Authentication Flow

```
Frontend                                Backend
   │                                      │
   ├─ User enters credentials ────────────→
   │                               /api/auth/register
   │                                      │
   │                        ◆ Validate input
   │                        ◆ Hash password (bcrypt)
   │                        ◆ Create MongoDB user
   │
   ←─ JWT token + user_id ────────────────┤
   │                                      │
   ├─ Store token in localStorage
   ├─ Include in Authorization headers
   │
```

### 2. Emotion Analysis Flow

```
Frontend                                Backend
   │                                      │
   ├─ Face Detection ────────────────────→
   ├─ Voice Recording                /api/emotion/analyze
   ├─ Text Input                    (with multipart data)
   │                                      │
   │                        ◆ Receive face/voice/text
   │                        ◆ Load ML models
   │                        ◆ Run inference:
   │                        ├─ Face CNN → emotion
   │                        ├─ Voice BiLSTM → emotion
   │                        └─ Text Transformer → emotion
   │                        ◆ Fuse emotions (weighted avg)
   │                        ◆ Check distress alerts
   │                        ◆ Save to MongoDB
   │                        ◆ Upload media to Cloudinary
   │
   ←─ Fused result + record_id ────────────┤
   │                                       │
   │                                    (WebSocket)
   │                                   /socket.io/
   │                                       │
   │                    (Real-time stream of emotions)
   │←─ emotion_detected ───────────────────┤
   ├─ Update dashboard
   ├─ Check for alerts
   └─ Store in history
```

### 3. Guardian Alert Flow

```
Frontend                                Backend
   │                                      │
   ├─ Emotion detected (sad, high intensity)
   │                     /api/emotion/analyze
   │                                      │
   │                        ◆ Check if emotion triggers alert
   │                        ◆ HIGH_INTENSITY rule applied
   │                        ◆ Severity: critical
   │                        ◆ Create alert record
   │                        ◆ Send emails to guardians
   │
   ←─ Alert created + emails sent ────────┤
   │                                      │
   │                                 (WebSocket)
   │←─ emotion_with_alert ────────────────┤
   ├─ Show alert notification
   ├─ Highlight emotion state
   └─ Store in alerts history
```

### 4. Chat Interaction Flow

```
Frontend                                Backend
   │                                      │
   ├─ User types message ────────────────→
   │                             /api/chat/send-message
   ├─ Current emotion attached              │
   │                                      │
   │                        ◆ Validate message
   │                        ◆ Load emotion templates
   │                        ◆ Generate context response
   │                        ◆ Select emotion-aware reply
   │
   ←─ AI response + emotion context ──────┤
   │                                      │
   ├─ Display response
   ├─ Show emotion awareness
   └─ Store in conversation
```

## API Integration Details

### Authentication Flow

```javascript
// Frontend: Register
const registerUser = async (email, username, password) => {
  const response = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password })
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};

// Frontend: API call with token
const analyzEmotion = async (faceData, voiceData, textData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5000/api/emotion/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      face_emotion: faceData,
      voice_emotion: voiceData,
      text_emotion: textData,
      weights: { face: 0.4, voice: 0.3, text: 0.3 }
    })
  });
  
  return await response.json();
};
```

### WebSocket Integration

```javascript
// Frontend: WebSocket connection
import io from 'socket.io-client';

const socket = io('ws://localhost:5000', {
  query: { user_id: userId }
});

// Subscribe to emotion stream
socket.emit('subscribe_emotion_stream', { user_id: userId });

// Listen for emotions
socket.on('emotion_detected', (data) => {
  console.log('New emotion:', data);
  updateDashboard(data);
});

// Listen for alerts
socket.on('emotion_with_alert', (data) => {
  console.log('Alert!', data);
  showAlert(data.alerts);
});

// Ping to keep connection alive
setInterval(() => {
  socket.emit('ping');
}, 30000);
```

### Media Upload Flow

```javascript
// Frontend: Upload image with emotion record
const uploadImage = async (file, emotionRecordId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('emotion_record_id', emotionRecordId);
  
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:5000/api/media/upload-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const data = await response.json();
  return data.url; // Cloudinary URL
};
```

## Configuration

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_WEBSOCKET_URL=ws://localhost:5000
```

### Backend (.env)
```env
FLASK_ENV=development
MONGODB_URI=mongodb://root:rootpassword@localhost:27017/emotion_detection
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Running Together

### Option 1: Local Development

**Terminal 1: Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
# Backend running on http://localhost:5000
```

**Terminal 2: Frontend**
```bash
cd frontend
npm install
npm run dev
# Frontend running on http://localhost:5173
```

### Option 2: Docker

```bash
# From backend directory
docker-compose up

# Backend on http://localhost:5000
# MongoDB on localhost:27017
# Redis on localhost:6379
```

## Error Handling

### Frontend Error Handling
```javascript
// Add interceptor for 401 (unauthorized)
const response = await fetch(url, { headers });

if (response.status === 401) {
  // Token expired, redirect to login
  localStorage.removeItem('token');
  window.location.href = '/login';
}

if (response.status === 403) {
  // Permission denied
  showErrorMessage('You do not have permission to access this resource');
}
```

### Backend Error Responses
```python
# All errors follow this format:
{
  "error": "Description",
  "status": "error"
}

# Success responses:
{
  "success": true,
  "data": {...}
}
```

## Performance Considerations

1. **Token Refresh**: Frontend automatically refreshes tokens before expiry
2. **History Limit**: Backend limits emotion history to 200 entries
3. **Media Optimization**: Cloudinary handles image compression
4. **WebSocket Caching**: Emotion results cached client-side
5. **Database Indexes**: MongoDB indexed on user_id, created_at

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] SQL injection prevention (using MongoDB)
- [ ] XSS protection (React automatic)
- [ ] CSRF tokens for state-changing operations
- [ ] API keys rotated regularly
- [ ] Sensitive data not logged
- [ ] Input validation on both sides

## Testing Integration

```bash
# Backend unit tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm run test

# Integration tests
npm run test:integration
```

## Monitoring

### Logs to monitor
- Authentication failures
- ML model inference errors
- Alert generation and delivery
- WebSocket connection issues
- Database connection problems

### Metrics to track
- API response times
- Model inference latency
- Email delivery rate
- Error rate percentage
- Active WebSocket connections

## Troubleshooting

### 401 Unauthorized
- Check token is included in headers
- Verify token hasn't expired
- Ensure JWT_SECRET_KEY matches both sides

### CORS Errors
- Verify CORS_ORIGINS includes frontend URL
- Check if wildcard (*) is needed for development

### WebSocket Connection Failed
- Check backend is running
- Verify WebSocket URL is correct
- Check firewall/proxy settings

### MongoDB Connection
- Verify connection string
- Check IP whitelist (MongoDB Atlas)
- Verify database user permissions

## Next Steps

1. Implement comprehensive error boundary components
2. Add request retry logic with exponential backoff
3. Implement request caching strategies
4. Add detailed logging and monitoring
5. Set up CI/CD pipeline
6. Implement E2E tests
