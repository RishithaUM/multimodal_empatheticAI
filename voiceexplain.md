# Voice Emotion Detection Explained

This document explains the current voice emotion pipeline in the codebase from the moment the user presses record to the moment the backend returns an emotion result.

## What the user experiences

The voice flow is part of the Analyze page. The user starts recording with the microphone, speaks for a few seconds, stops recording, and the app sends the captured audio to the backend for emotion detection.

At a high level, the flow is:

1. The browser records microphone audio.
2. The frontend keeps a live waveform moving while recording.
3. When recording stops, the audio is converted into a WAV payload.
4. The frontend sends the WAV data to the backend as base64.
5. The backend writes the audio to a temporary file.
6. The active voice model reads the audio file and predicts emotion.
7. The backend returns the emotion, confidence, and score breakdown.
8. The Analyze page stores that voice result and later uses it in multimodal fusion.

## Frontend capture step

The active frontend logic lives in [frontend/src/hooks/useVoiceAnalysis.ts](frontend/src/hooks/useVoiceAnalysis.ts).

### Recording starts

When recording starts, the hook:

- checks that microphone access is available
- requests microphone permission with `getUserMedia({ audio: true })`
- creates an `AudioContext`
- connects the microphone stream to an `AnalyserNode`
- creates a `MediaRecorder`
- starts recording audio chunks every 100 ms

While recording, the hook also reads frequency data from the analyser and converts it into bar heights for the waveform display.

### Recording stops

When recording stops, the hook:

- stops the recorder
- stops the microphone tracks
- collects the recorded `webm` chunks
- decodes the `webm` blob into raw PCM audio
- converts the PCM data into a WAV file in memory
- base64-encodes the WAV buffer

That conversion is important because the backend route expects audio data in JSON form, not as a raw file upload.

## Frontend request

After encoding, the hook sends the request to the backend from [frontend/src/hooks/useVoiceAnalysis.ts](frontend/src/hooks/useVoiceAnalysis.ts).

The request body looks like this:

```json
{
  "audio_data": "<base64-wav-bytes>"
}
```

The hook chooses the endpoint based on whether a valid token exists:

- authenticated: `/api/emotion/detect/voice`
- test mode: `/api/emotion/detect/voice/test`

If the backend returns `401`, the hook clears the token and retries the test endpoint once.

## Backend route that receives the audio

The active backend route is in [backend/app/routes/emotion.py](backend/app/routes/emotion.py).

### Authenticated route

`POST /api/emotion/detect/voice`

### Test route

`POST /api/emotion/detect/voice/test`

Both routes accept the same JSON payload with `audio_data` or `audio_path`.

### What the backend does

The backend route:

1. reads the JSON body
2. checks that `audio_data` or `audio_path` exists
3. base64-decodes `audio_data` if needed
4. writes the bytes to a temporary `.wav` file
5. gets the active voice detector from `current_app.ml_model_manager.voice_model`
6. calls `detect_emotion(audio_path)` on that detector
7. removes the temporary file
8. returns the emotion result as JSON

If the detector returns an error or very low confidence, the route still returns a safe degraded response rather than crashing the request.

## How the model is chosen

The model selection lives in [backend/ml_models/model_manager.py](backend/ml_models/model_manager.py).

The startup logic is:

1. create the face model
2. create the voice model
3. create the text model

For voice, the manager first tries the Kvilla + SUPERB fusion stack. If that cannot load, it falls back to the older wav2vec2 + SUPERB dual-model detector.

The selected object is stored as `app.ml_model_manager.voice_model`, which is what the voice route uses.

## Primary voice pipeline: Kvilla + SUPERB

The main implementation is in [backend/ml_models/voice/voice_emotion_kvilla_superb.py](backend/ml_models/voice/voice_emotion_kvilla_superb.py).

### 1. Load and normalize audio

The audio is loaded with `librosa` and normalized to:

- 16 kHz sample rate
- mono channel
- amplitude scaled to the `[-1, 1]` range

### 2. Split audio into chunks

The detector splits the audio into roughly 2.5 second windows.

It also tries to remove long silence regions so that empty sections do not distort the prediction.

If no valid chunk survives the filtering, it falls back to using the full audio.

### 3. Run Kvilla on each chunk

The `KvillaEmotionDetector`:

- loads a local model from the `models/Kvilla` folder if available
- otherwise tries the Hugging Face checkpoint
- runs `AutoProcessor` and the audio classification model
- converts logits into probabilities with softmax
- maps label ids to emotions like angry, disgusted, fearful, happy, neutral, sad, and surprised

Each chunk returns:

- `emotion`
- `confidence`
- `all_scores`
- `model: kvilla`

### 4. Run SUPERB on each chunk

The `SUPERBEmotionDetector`:

- loads the SUPERB emotion model
- predicts three underlying dimensions: arousal, dominance, and valence
- maps those dimensions to emotion scores

That produces another emotion distribution for the same chunk.

### 5. Fuse Kvilla and SUPERB

The `KvillaSuperBFusion` class combines both detectors.

The fusion logic:

- gives Kvilla the higher default weight
- increases SUPERB weight when Kvilla confidence is low
- boosts confidence if both models agree on the same emotion
- merges the score dictionaries into one final result

The final response contains:

- `emotion`
- `confidence`
- `all_scores`
- `model: kvilla_superb_fusion`
- `fusion_info`

## Fallback voice pipeline: wav2vec2 + SUPERB

If the primary Kvilla stack cannot load, the manager falls back to [backend/app/services/wav2vec2_emotion.py](backend/app/services/wav2vec2_emotion.py).

That detector works like this:

1. load audio from disk
2. extract wav2vec2 embeddings
3. run the SUPERB emotion classifier
4. fuse the results into a single prediction

This fallback keeps voice emotion detection available even if the primary model path is missing or unavailable.

## Alternate legacy route

There is also a separate blueprint in [backend/app/routes/voice_emotion.py](backend/app/routes/voice_emotion.py).

That file exposes multipart upload routes under `/api/emotion/voice/...`.

It is useful as an alternate implementation, but the current Analyze page is wired to the `/api/emotion/detect/voice` path in [backend/app/routes/emotion.py](backend/app/routes/emotion.py), so that is the active flow for the app today.

## What the backend returns

The backend response usually includes:

- `success`
- `emotion`
- `confidence`
- `scores` or `all_scores`
- `metadata`

The frontend hook then converts that into a `ModalityResult` with:

- `modality: 'voice'`
- a capitalized emotion label for UI display
- percentages for each score entry

## What the Analyze page does with the voice result

The Analyze page is in [frontend/src/pages/analyze/page.tsx](frontend/src/pages/analyze/page.tsx).

After the voice analysis finishes, the page:

1. stores the voice result as `capturedVoiceResult`
2. marks voice capture as complete
3. waits for the user to analyze the other modalities if needed
4. passes the captured voice result into the fusion step

The multimodal fusion itself happens in [frontend/src/services/emotionApi.ts](frontend/src/services/emotionApi.ts), where voice is one of the inputs alongside face and text.

## End-to-end summary

In one sentence: the browser records microphone audio, converts it to a WAV payload, sends it to the backend as base64, the backend writes a temporary file and passes it to the active voice detector, and the detector returns the predicted emotion with confidence and score breakdown.

## Short version

The voice pipeline is:

record -> encode -> send -> decode -> load model -> chunk audio -> predict emotion -> fuse scores -> return result -> show it in the UI.