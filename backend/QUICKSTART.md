# Quick Start Guide

## 5-Minute Setup

### Prerequisites
- Python 3.8+
- MongoDB (local or Atlas)
- Git

### Steps

1. **Navigate to backend**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/Scripts/activate  # Windows
# or
source venv/bin/activate      # Mac/Linux
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Minimal required settings
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/emotion_detection
FLASK_ENV=development
SECRET_KEY=any-random-string-here
JWT_SECRET_KEY=any-random-string-here

# Optional (for email alerts)
EMAIL_FROM_ADDRESS=your-email@gmail.com
EMAIL_API_KEY=your-app-password
```

5. **Run the server**
```bash
python run.py
```

Server runs at: **http://localhost:5000**

### Test the API

```bash
# Health check
curl http://localhost:5000/api/health

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

## Using Docker

```bash
# Single command to start everything
docker-compose up

# MongoDB: localhost:27017 (user: root, pass: rootpassword)
# Backend: http://localhost:5000
# Redis: localhost:6379
```

## Common Issues

### MongoDB Connection Error
**Problem**: `pymongo.errors.ServerSelectionTimeoutError`

**Solution**:
- Check MongoDB URI is correct
- Verify IP whitelist on MongoDB Atlas
- Ensure database user has correct permissions

### Port Already in Use
**Problem**: `OSError: [Errno 48] Address already in use`

**Solution**:
```bash
# Kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :5000
kill -9 <PID>
```

### Import Errors
**Problem**: `ModuleNotFoundError: No module named 'app'`

**Solution**:
```bash
# Make sure you're in the backend directory
cd backend

# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

## Next Steps

1. **Integrate with Frontend**: See `INTEGRATION_GUIDE.md`
2. **Configure Cloudinary**: Set API keys in `.env`
3. **Set up Email**: Configure Gmail app password or SendGrid
4. **Deploy**: Use Docker for production

## File Organization

```
backend/
├── app/
│   ├── routes/        ← API endpoints
│   ├── models/        ← Database schemas
│   ├── services/      ← Business logic
│   └── __init__.py    ← Flask app factory
├── ml_models/         ← ML models (CNN, BiLSTM, Transformer)
├── run.py             ← Entry point
├── requirements.txt   ← Dependencies
└── .env              ← Configuration (create from .env.example)
```

## API Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Create new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/emotion/analyze` | Analyze emotion |
| GET | `/api/emotion/history` | Get emotion history |
| POST | `/api/alerts/create` | Create guardian alert |
| GET | `/api/settings/` | Get user settings |
| POST | `/api/media/upload-image` | Upload image |
| POST | `/api/chat/send-message` | Send chat message |

See `README.md` for full API documentation.

## Environment Variables

### Required
- `MONGODB_URI` - MongoDB connection string
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key

### Optional
- `CLOUDINARY_CLOUD_NAME` - For media upload
- `CLOUDINARY_API_KEY` - For media upload
- `CLOUDINARY_API_SECRET` - For media upload
- `EMAIL_FROM_ADDRESS` - For email alerts
- `EMAIL_API_KEY` - For email alerts

## WebSocket Connection

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  query: { user_id: 'user123' }
});

socket.on('emotion_detected', (data) => {
  console.log('Emotion:', data);
});
```

## Development Tips

1. **Enable Debug Mode**:
   ```bash
   export FLASK_DEBUG=1
   python run.py
   ```

2. **Use GPU for ML**:
   ```env
   MODEL_DEVICE=cuda
   ```

3. **View MongoDB Data**:
   - Use MongoDB Compass
   - Or MongoDB Atlas web interface

4. **Test Email Locally**:
   - Use Mailhog or similar SMTP server
   - Set `SMTP_SERVER=localhost:1025`

## Performance Notes

- First ML model load: ~5 seconds
- Emotion analysis: ~500ms per modality
- WebSocket connection: <50ms latency
- Database queries: <100ms average

## Support

- GitHub Issues: Report bugs
- Documentation: See README.md and INTEGRATION_GUIDE.md
- Issues? Check TROUBLESHOOTING section in README.md

---

Happy coding! 🚀
