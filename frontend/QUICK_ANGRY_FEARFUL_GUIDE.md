# Quick Reference: Angry vs Fearful Distinction

## Changes Made

### 1. Updated Emotion Fusion Weights (emotionApi.ts)
```typescript
FUSION_WEIGHTS = {
  face:  0.35,  // Down from 0.45
  voice: 0.40,  // Up from 0.35
  text:  0.25,  // Up from 0.20
}
```

### 2. Added Smart Disambiguation (emotionApi.ts - fuseEmotions function)
- When Angry and Fearful scores are within 8% of each other
- Uses Voice modality to disambiguate (most reliable)
- Falls back to Text modality if needed
- Logs the decision in console

### 3. Console Warnings (emotionApi.ts - detectFaceEmotionMultiFrame function)
- Shows when Angry/Fearful are ambiguous
- Alerts user that voice/text will be used to disambiguate

## Testing Workflow

### Quick Test (Face Only)
```
1. localhost:3000/analyze
2. Record angry face
3. Click "Analyze"
4. Check console for face detection result
```

### Full Test (All Modalities)
```
1. Record face (5s)
2. Add voice recording ("I'm angry!" / "I'm scared!")
3. Add optional text
4. Click "Analyze Emotion"
5. Check console for:
   - Face detection (might be ambiguous)
   - Voice analysis (disambiguates)
   - Final fused result
```

## Console Indicators

### ✅ Clear Result
```
📊 AVERAGING ALL FRAMES RESULTS
  1. Angry        ████████░░ 75%
  2. Fearful      ███░░░░░░░ 28%

🎯 FINAL RESULT: Angry (75% confidence)
```

### ⚠️ Ambiguous (Will Use Voice/Text)
```
⚠️  AMBIGUOUS: Angry (62%) vs Fearful (58%) - Will use voice/text for disambiguation
```

### 🔍 Disambiguation Result
```
⚠️ Angry/Fearful too similar (Angry: 62%, Fearful: 58%)
🔍 Using voice/text analysis to disambiguate:
  Voice favors: Angry (70% vs 45%)
  Final result: Angry ✓
```

## Key Points

1. **Face-only is unreliable** for Angry/Fearful - multi-modal fusion is essential
2. **Voice is the best disambiguator** - aggressive vs trembling tone
3. **Text sentiment helps** - harsh words vs worry words
4. **Threshold is 8%** - can be adjusted in code if needed
5. **All models are local** - no CDN dependency, fast loading

## Troubleshooting

### If Still Confused
1. Lower the ambiguity threshold from 8% to 6% in fuseEmotions()
2. Reduce face weight further (to 0.30)
3. Increase voice weight (to 0.45)

### If Recording Issues
1. Check microphone permissions
2. Ensure audio is clear
3. Voice analysis needs good audio quality to work well

## Files Modified
- `src/services/emotionApi.ts` - Fusion weights + disambiguation logic + console warnings

## Next Steps (Optional)
- Fine-tune threshold value based on real-world testing
- Collect metrics on disambiguation success rate
- Consider MediaPipe Face Mesh for micro-expressions
