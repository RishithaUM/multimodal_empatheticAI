# Distinguishing Angry vs Fearful Emotions

## Problem
FaceExpressionNet sometimes confuses **Angry** and **Fearful** because they share similar facial features (tense eyes, raised brows). Relying solely on face detection gives unreliable results.

## Solution Implemented

### 1. **Updated Fusion Weights** ✅
Changed the emotion fusion algorithm to reduce face reliance and increase voice/text influence:

```typescript
FUSION_WEIGHTS: {
  face:  0.35  // ← Reduced from 45% (face alone confuses angry/fearful)
  voice: 0.40  // ← Increased from 35% (voice distinguishes well)
  text:  0.25  // ← Increased from 20% (text helps differentiate)
}
```

**Why this works:**
- **Voice**: Angry = aggressive/harsh tone; Fearful = trembling/worried tone
- **Text**: Angry = harsh/offensive words; Fearful = worry/anxiety words
- **Face**: Reduced influence since it's the weakest at this distinction

### 2. **Angry/Fearful Disambiguation Logic** ✅
When face detection produces ambiguous results (angry & fearful scores within 8% of each other):

1. **Checks voice priority**: Uses voice emotion scores to disambiguate
2. **Falls back to text**: If voice doesn't help, checks text sentiment
3. **Logs the decision**: Console shows which modality won the tiebreaker

```typescript
if ((topEmotion === 'Angry' || topEmotion === 'Fearful') && difference < 8) {
  console.warn(`⚠️ Angry/Fearful too similar...`)
  // Use voice then text to decide
}
```

### 3. **Console Feedback** ✅
Face detection now warns when angry/fearful are ambiguous:

```
📊 AVERAGING ALL FRAMES RESULTS

✅ Successfully analyzed 10 frames

  1. Angry        ████████░░ 65%
  2. Fearful      ███████░░░ 58%
  3. Neutral      ███░░░░░░░ 15%
  ...

⚠️  AMBIGUOUS: Angry (65%) vs Fearful (58%) - Will use voice/text for disambiguation
```

Then during fusion:

```
⚠️ Angry/Fearful too similar (Angry: 65%, Fearful: 58%)
🔍 Using voice/text analysis to disambiguate:
  Voice favors: Angry (75% vs 40%)
  Final result: Angry ✓
```

## How to Test

### Test Case 1: Clear Angry Face
1. Go to `localhost:3000/analyze`
2. Make an angry face (frown, furrow brow, tense jaw)
3. Record for 5 seconds → Stop
4. Add voice: "I'm so angry!" or similar
5. Console should show: **Angry** (high confidence)

### Test Case 2: Clear Fearful Face
1. Make a fearful face (wide eyes, raised brows, mouth open)
2. Record for 5 seconds → Stop
3. Add voice: "I'm scared!" or similar
4. Console should show: **Fearful** (high confidence)

### Test Case 3: Ambiguous (Tests Disambiguation)
1. Make a tense face (can look angry or fearful)
2. Record for 5 seconds → Stop
3. Console will show: `⚠️ AMBIGUOUS: Angry (60%) vs Fearful (58%)`
4. During fusion: Voice/text will disambiguate the result

## Console Output Example

```
═══════════════════════════════════════════════════════════
🎬 MULTI-FRAME FACE EMOTION DETECTION STARTED
📊 Capturing 10 frames with 100ms interval
═══════════════════════════════════════════════════════════

📹 FRAME 1/10:
─────────────────────────────
  1. Angry        ████████░░ 68% (0.678)
  2. Fearful      ███████░░░ 58% (0.584)
  3. Neutral      ██░░░░░░░░ 10% (0.102)
  ➜ Detected: Angry (68%)

[...frames 2-10...]

═══════════════════════════════════════════════════════════
📊 AVERAGING ALL FRAMES RESULTS
═══════════════════════════════════════════════════════════

✅ Successfully analyzed 10 frames

  1. Angry        ███████░░░ 62%
  2. Fearful      ██████░░░░ 56%
  3. Neutral      ██░░░░░░░░ 12%

⚠️  AMBIGUOUS: Angry (62%) vs Fearful (56%) - Will use voice/text for disambiguation

🎯 FINAL RESULT: Angry (62% confidence)
═══════════════════════════════════════════════════════════
```

Then during multi-modal fusion (if voice/text included):

```
⚠️ Angry/Fearful too similar (Angry: 62%, Fearful: 56%)
🔍 Using voice/text analysis to disambiguate:
  Voice favors: Angry (70% vs 45%)
  Final result: Angry ✓
```

## Technical Details

### Modified Files
- `src/services/emotionApi.ts`
  - Updated `FUSION_WEIGHTS` object (lines ~528-533)
  - Enhanced `fuseEmotions()` function with disambiguation logic (lines ~543-595)
  - Added ambient/fearful check in `detectFaceEmotionMultiFrame()` (lines ~310-316)

### Threshold Value
- **Ambiguity threshold**: 8% (if Angry and Fearful scores differ by less than 8%)
- This threshold can be adjusted if needed (higher = more aggressive disambiguation)

### Modality Priority for Disambiguation
1. **Voice** (most reliable for angry vs fearful distinction)
2. **Text** (secondary, good for confirming)
3. **Face** (primary source, used if others don't disambiguate)

## Future Improvements

If this still isn't accurate enough:

1. **Adjust weights further** (reduce face to 0.30, increase voice to 0.45)
2. **Lower ambiguity threshold** (to 6% instead of 8%)
3. **Add micro-expression analysis** (use MediaPipe Face Mesh for 478 landmarks)
4. **Fine-tune model** (use TensorFlow with custom training data)
5. **Voice acoustic features**:
   - Angry: Higher pitch variance, faster speech rate
   - Fearful: Lower stability, more frequency changes

## Notes

- Multi-frame averaging already helps reduce false positives
- Voice analysis is key - make sure microphone captures clear audio
- Text sentiment (AFINN) provides good angry vs fearful distinction
- System is resilient: even if one modality fails, others take over
