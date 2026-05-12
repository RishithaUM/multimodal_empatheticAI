# EmpathAI — Fresh Install Setup Guide

Complete step-by-step guide to install and run EmpathAI from scratch on a new machine.

---

## Prerequisites

Install these before anything else.

### 1. Python 3.10+
Download from https://www.python.org/downloads/

> **Windows**: During install, check **"Add Python to PATH"**

Verify:
```bash
python --version
# Expected: Python 3.10.x or 3.11.x
```

### 2. Node.js 18+ (LTS)
Download from https://nodejs.org/

Verify:
```bash
node --version   # Expected: v18.x or higher
npm --version    # Expected: 9.x or higher
```

### 3. Git
Download from https://git-scm.com/

Verify:
```bash
git --version
```

### 4. MongoDB Atlas Account (free)
1. Go to https://cloud.mongodb.com
2. Create a free account
3. Create a new **free cluster** (M0 Sandbox)
4. Under **Database Access** → Add a user (username + password)
5. Under **Network Access** → Add your IP (or `0.0.0.0/0` for all IPs)
6. Click **Connect** → **Drivers** → copy the connection string

Keep the connection string — you'll need it later.

### 5. Cloudinary Account (free)
1. Go to https://cloudinary.com
2. Create a free account
3. From your dashboard, copy: **Cloud Name**, **API Key**, **API Secret**

### 6. SendGrid Account (free tier)
1. Go to https://sendgrid.com
2. Create a free account
3. Go to **Settings → API Keys** → Create API Key (Full Access)
4. Copy the API key

### 7. Ollama (for text emotion)
Download from https://ollama.com/download

After installing, pull the model:
```bash
ollama pull llama3.1:8b
```

Verify:
```bash
ollama list
# Should show: llama3.1:8b
```

---

## Step 1 — Clone / Copy the Project

If you're copying from another machine, just transfer the entire `emotion/` folder.

If cloning from Git:
```bash
git clone <your-repo-url> emotion
cd emotion
```

---

## Step 2 — Backend Setup

### 2.1 Create Virtual Environment

```bash
cd backend
python -m venv venv
```

Activate it:

**Windows (PowerShell):**
```powershell
cd backend
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\.venv\Scripts\Activate.ps1
python run.py
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```nd

**macOS / Linux:**
```bash
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### 2.2 Install Python Dependencies

```bash
pip install -r requirements.txt
```

> This takes 5–15 minutes — it installs PyTorch, TensorFlow, transformers, and other large libraries.

If you hit errors on Windows with `torch`, install it separately first:
```bash
pip install torch==2.1.1 torchvision==0.16.1 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

### 2.3 Create the `.env` File

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in your values:

```env
# Flask
FLASK_ENV=development
SECRET_KEY=any-long-random-string-here
DEBUG=True

# MongoDB Atlas
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@your-cluster.mongodb.net/emotion_detection?retryWrites=true&w=majority
MONGODB_DB=emotion_detection

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET_KEY=another-long-random-string-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Email (SendGrid)
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_FROM_ADDRESS=your_verified_sender@gmail.com
EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
FRONTEND_URL=http://localhost:3000

# ML Models
MODEL_DEVICE=cpu
VOICE_EMOTION_MODEL=kvilla
TEXT_EMOTION_MODEL=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_TEXT_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_SECONDS=30

# Features
ENABLE_EMOTION_FUSION=true
ENABLE_DISTRESS_DETECTION=true
ENABLE_REAL_TIME_STREAMING=true
MAX_EMOTION_HISTORY=200
```

> **Note**: For `EMAIL_FROM_ADDRESS`, use an email address you've verified as a sender in SendGrid.

### 2.4 Copy ML Model Weights

The `models/` folder at the project root contains pre-downloaded model weights. Make sure it's present with these three folders:

```
models/
├── Kvilla/        ← primary voice model
├── superb_er/     ← voice fusion model
└── wav2vec2/      ← audio feature extractor
```

If these folders are missing or empty, the voice emotion detection will fall back to a simple librosa-based classifier automatically — you won't get an error, just lower accuracy.

### 2.5 Test the Backend

```bash
python run.py
```

Expected output:
```
Loading Face Emotion Model...
✅ Face model loaded
Loading Voice Emotion (Kvilla+SUPERB)...
✅ Voice model loaded
Loading Text Emotion (Ollama)...
✅ Text model loaded
 * Running on http://127.0.0.1:5000
```

Verify it works:
```bash
curl http://localhost:5000/api/health
# Expected: {"status": "healthy", ...}
```

---

## Step 3 — Frontend Setup

Open a **new terminal** (keep the backend running).

```bash
cd frontend
npm install
```

This installs all Node.js dependencies (React, Vite, Tailwind, etc.). Takes 1–3 minutes.

### 3.1 Start the Frontend

```bash
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser.

---

## Step 4 — Verify Everything Works

1. Open http://localhost:3000
2. Register a new account (email + username + password)
3. You'll land on the **Analyze** page
4. Allow camera and microphone permissions when the browser asks
5. Start a face, voice, or text analysis session

Health check endpoints:
```
http://localhost:5000/api/health          ← backend alive
http://localhost:5000/api/auth/verify-token  ← auth working
```

---

## Common Issues

### "Module not found" on backend start
Make sure your virtual environment is **activated** before running `python run.py`.

### "venv\Scripts\Activate.ps1 cannot be loaded" (PowerShell)
Run this once to allow local scripts:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### MongoDB connection refused
- Check your `MONGODB_URI` in `.env`
- Make sure your IP is whitelisted in MongoDB Atlas → Network Access
- Try adding `0.0.0.0/0` temporarily to test

### Ollama not responding
```bash
# Check it's running
ollama list

# Start Ollama manually if needed (Windows: it runs as a system service after install)
ollama serve
```

### Camera/microphone not working in browser
- Must be on `http://localhost` (not a network IP) for browser to grant device permissions
- Use Chrome or Edge for best compatibility

### Port 5000 already in use
```bash
# Windows — find and kill whatever is using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### `npm install` fails
Make sure Node.js 18+ is installed. Try clearing the cache:
```bash
npm cache clean --force
npm install
```

---

## Running Both Servers Daily

After the first-time setup, this is all you need each time:

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\Activate.ps1    # Windows
source venv/bin/activate     # macOS/Linux
python run.py
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `SECRET_KEY` | ✅ | Flask secret key (any random string) |
| `JWT_SECRET_KEY` | ✅ | JWT signing key (any random string) |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `EMAIL_API_KEY` | ✅ | SendGrid API key |
| `EMAIL_FROM_ADDRESS` | ✅ | Verified sender email |
| `OLLAMA_URL` | ✅ | Ollama server URL (default: localhost:11434) |
| `MODEL_DEVICE` | — | `cpu` or `cuda` (default: cpu) |
| `VOICE_EMOTION_MODEL` | — | `kvilla` or `wav2vec2` (default: kvilla) |
