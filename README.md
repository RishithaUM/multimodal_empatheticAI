# EmpathAI — Multimodal Emotion Detection System

EmpathAI detects human emotions in real time using **face**, **voice**, and **text** simultaneously, then fuses all three into a single confident result. It sends automated email alerts to guardians when a user shows the same distress emotion three times consecutively.

---
## Live Working video :

Drive Link :


## Features

- **Face Emotion** — CNN (DeepFace + ResNet50) detects emotion from live camera frames
- **Voice Emotion** — Kvilla wav2vec2 + SUPERB ER fusion model (~85% accuracy)
- **Text Emotion** — Ollama LLM (llama3.1:8b) for context-aware text analysis
- **Multimodal Fusion** — Weighted average of all three modalities
- **Guardian Alerts** — SendGrid email when same emotion detected 3× in a row (10-min cooldown)
- **Emotion History** — Logged to MongoDB, viewable on History page
- **Real-time WebSocket** — Live emotion stream via Socket.IO
- **Emotion-aware Chat** — AI chat that adapts responses based on current emotion

## Pages

| Route | Description |
|-------|-------------|
| `/analyze` | Main page — face, voice, text detection |
| `/results` | Last analysis result |
| `/history` | Past emotion sessions |
| `/chat` | Emotion-aware AI chat |
| `/alerts` | Guardian alert history |
| `/settings` | Guardian emails, preferences |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Python, Flask, Flask-SocketIO |
| Database | MongoDB Atlas |
| Face ML | DeepFace, ResNet50, OpenCV |
| Voice ML | Kvilla wav2vec2 + SUPERB ER (PyTorch) |
| Text ML | Ollama (llama3.1:8b) |
| Email | SendGrid |
| Media | Cloudinary |
| Auth | JWT (PyJWT + bcrypt) |

## Project Structure

```
emotion/
├── backend/            # Flask API + ML models
│   ├── app/
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic (email, auth, emotion)
│   │   ├── models/     # MongoDB document models
│   │   └── utils/      # Helpers
│   ├── ml_models/      # Face, voice, text ML models
│   ├── requirements.txt
│   ├── run.py          # Entry point
│   └── .env            # Environment config (not committed)
├── frontend/           # React + Vite SPA
│   ├── src/
│   │   ├── pages/      # analyze, results, history, chat, alerts, settings
│   │   ├── components/ # Shared UI components
│   │   ├── services/   # API + WebSocket clients
│   │   └── hooks/      # Custom React hooks
│   └── package.json
├── models/             # Downloaded ML model weights
│   ├── Kvilla/         # Primary voice model
│   ├── superb_er/      # Voice fusion model
│   └── wav2vec2/       # Audio feature extractor
└── SETUP.md            # Full installation guide
```

## Quick Start (after setup)

```bash
# Terminal 1 — Backend
cd backend
python run.py

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:3000

> See [SETUP.md](SETUP.md) for full installation on a new machine.
