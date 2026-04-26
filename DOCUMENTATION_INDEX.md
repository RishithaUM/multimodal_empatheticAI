# Voice Emotion Detection Documentation Index

This index reflects the current, working system:
- Primary model: Kvilla (local model from models/Kvilla)
- Secondary model: SUPERB (fusion stabilizer)
- Final decision: weighted fusion (Kvilla-first)

## Canonical Docs

1. KVILLA_README.md
  - Main user + integration guide
  - Startup, endpoints, expected payloads
  - What to check in backend logs

2. voice.md
  - Clean testing phrases and recording protocol
  - How to interpret model behavior during manual tests

3. backend/ml_models/voice/KVILLA_SUPERB_INTEGRATION.md
  - Technical architecture and internals
  - Fusion logic and output schema

## Current Endpoints Used by Frontend

1. POST /api/emotion/detect/voice
  - Auth route (JWT)
  - JSON payload with audio_data (base64 WAV)

2. POST /api/emotion/detect/voice/test
  - No-auth fallback route
  - Same JSON payload format

## Quick Start

1. Backend
  - cd backend
  - python run.py

2. Frontend
  - cd frontend
  - npm run dev

3. Open
  - http://localhost:3000/analyze

## Expected Voice Logs in Terminal

1. Chunk-level logs
  - [VOICE][CHUNK x/y][KVILLA] ...
  - [VOICE][CHUNK x/y][SUPERB] ...

2. Aggregation + fusion
  - [VOICE][AGGREGATED] ...
  - [VOICE][FUSION] ...
  - [VOICE][FINAL] ...

3. Summary block
  - VOICE EMOTION ANALYSIS SUMMARY

## Notes

1. Preprocessor warning for local Kvilla model is expected in this setup.
2. Backend uses a fallback feature extractor when preprocessor files are missing.
3. Current docs intentionally remove old completion/status reports to avoid drift.
