# Quick Test - Voice Emotion Detection

## Fastest Way to Test (2 minutes)

### Step 1: Start Backend
```bash
cd backend
python run.py
```
Wait for: `Running on http://127.0.0.1:5000`

### Step 2: Start Frontend
```bash
cd frontend
npm run dev
```
Opens at: `http://localhost:3000`

### Step 3: Test Voice Emotion
1. Go to `http://localhost:3000/analyze`
2. Find the **Voice Emotion Detection** section
3. Click **Start Recording**
4. Speak for 2–5 seconds
5. Click **Stop Recording**
6. See emotion detected with confidence score!

---

## What You'll See

✅ Emotion detected: Angry, Happy, Neutral, Sad, Fearful, etc.
✅ Confidence percentage (0–100%)
✅ All emotion scores
✅ Audio features (energy, RMS, spectral centroid, ZCR)

---

## Notes

- Both backend (port 5000) and frontend (port 3000) must be running
- Browser must have microphone access — click "Allow" when prompted
- Voice detection uses Kvilla + SUPERB fusion model

---

## If Backend Isn't Running

Frontend will show a connection error. Fix:
```bash
cd C:\Users\prave\Desktop\emotion\backend
python run.py
```
Then refresh the browser.

