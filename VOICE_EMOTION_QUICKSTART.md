# Voice Emotion Detection - Quick Start

## What's Ready
✅ Complete voice emotion detection system
✅ Backend API with emotion detection models
✅ Frontend React component with microphone recording
✅ All tests passing
✅ Ready to use immediately

## How to Test

### 1. Start Backend (Terminal 1)
```bash
cd backend
python run.py
```
Output: `Running on http://localhost:5000`

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Output: `Local:   http://localhost:3001`

### 3. Open Browser
Navigate to: `http://localhost:3001/analyze`

### 4. Find Voice Section
Scroll to "Voice Recording" section

### 5. Test Recording
- Click **"Start"** button
- Speak for 2-5 seconds
- Click **"Stop"** button
- Wait for analysis to complete
- View emotion detected with confidence score

## What You'll See
- Emotion type: ANGRY, HAPPY, NEUTRAL, or SAD
- Confidence percentage (0-100%)
- Audio features: energy, RMS, spectral centroid, zero-crossing rate
- Live recording timer while capturing audio

## Features Included
✅ Real-time microphone recording
✅ Audio file upload support (WAV, MP3, OGG, FLAC, M4A)
✅ 4 emotion detection (angry/happy/neutral/sad)
✅ Confidence scoring
✅ Audio features extraction
✅ Responsive UI with Tailwind CSS
✅ Error handling and loading states

## System Architecture
- **Backend**: Flask Python with librosa audio processing
- **Frontend**: React TypeScript with Web Audio API
- **Models**: BiLSTM voice emotion classifier + simple fallback
- **Audio Support**: 16kHz mono/stereo WAV/MP3/OGG/FLAC/M4A

## API Endpoints (Backend)
- `POST /api/emotion/voice/test` - Analyze audio file
- `POST /api/emotion/voice/detect` - Emotion detection
- `GET /api/emotion/voice/models` - List available models
- `POST /api/emotion/voice/stream` - Stream processing
- `POST /api/emotion/voice/stream/reset` - Reset stream

## Need Help?
All files are in:
- Backend: `backend/app/routes/voice_emotion.py`
- Frontend: `frontend/src/components/feature/VoiceEmotionAnalyzer.tsx`
- Hook: `frontend/src/hooks/useVoiceAnalysis.ts`
