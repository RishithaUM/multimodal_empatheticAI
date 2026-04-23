# Quick Start: Emotion Detection Guide

## 🚀 How to Get Started

### Step 1: Open the App
- Navigate to the **Analyze** page
- Click **"Start Recording"** to begin video capture

### Step 2: Check Console Output
Open browser DevTools (F12 → Console tab) to see:
```
💡 Lighting: Good (145/255) - 💡 Good lighting!
```

**Lighting Recommendations:**
- **Poor (<50):** Too dark - move to brighter area
- **Fair (50-100):** Dim - turn on lights
- **Good (100-180):** ✅ Optimal
- **Excellent (180+):** ✅ Perfect

### Step 3: Position Your Face
- Sit 30-50cm from camera
- Look straight at camera
- Keep face centered in frame
- Hold clear expression for 4 seconds

### Step 4: Click "Analyze"
The system will:
1. Capture 40 frames over 4 seconds
2. Analyze each frame for facial expression
3. Remove outliers and noise
4. Average results for final emotion

### Step 5: Check Results
```
✅ Successfully analyzed 40 frames

1. Neutral      ████████████████░░░░ 78%
2. Happy        ██░░░░░░░░░░░░░░░░░░ 12%
3. Sad          █░░░░░░░░░░░░░░░░░░░ 7%
...
🎯 FINAL RESULT: Neutral (78% confidence)
```

---

## 💡 Tips for Best Accuracy

### ✅ DO:
- Use natural daylight (window light best)
- Sit at good distance (30-50cm)
- Face camera straight on
- Hold clear expression (1+ second)
- Keep head still during recording

### ❌ DON'T:
- Use room with harsh shadows
- Get too close or too far
- Tilt head at extreme angles
- Make rapid facial movements
- Block face with hands/hair

---

## 📊 What Each Emotion Shows

| Emotion | Shows Up When | Looks Like |
|---------|--------------|-----------|
| **Neutral** | Calm, resting face | Relaxed, no expression |
| **Happy** | Smiling, content | Smile, raised cheeks |
| **Sad** | Upset, frowning | Frown, downturned mouth |
| **Angry** | Mad, frustrated | Furrowed brows, tight mouth |
| **Fearful** | Scared, anxious | Wide eyes, raised brows |
| **Surprised** | Shocked, astonished | Open mouth, raised brows |
| **Disgusted** | Repulsed, annoyed | Wrinkled nose, grimace |

---

## 🔍 How It Works

### The 4-Second Analysis
```
0.0s   1.0s   2.0s   3.0s   4.0s
|------|------|------|------|
Frame: 1     10     20     30     40
```
- Captures 1 frame every 100ms
- Analyzes each frame independently
- Averages all 40 results
- Gives you most confident emotion

### Processing Steps
1. **Frame Capture** → Record video frames
2. **Face Detection** → Find face in frame
3. **Emotion Analysis** → 7 emotion scores per frame
4. **Noise Filtering** → Remove weak signals
5. **Outlier Removal** → Remove extreme scores
6. **Averaging** → Combine all 40 frames
7. **Final Result** → Show dominant emotion

---

## ⚡ Expected Accuracy

| Conditions | Accuracy |
|-----------|----------|
| **Perfect:** Bright light, straight on, clear expression | 85-90% |
| **Good:** Decent light, held expression | 75-85% |
| **Fair:** Dim light, subtle expression | 60-75% |
| **Poor:** Dark room, extreme angle, quick changes | 40-60% |

---

## 🆘 Troubleshooting

### "No face detected"
1. Check lighting (should show "Good" or "Excellent")
2. Move closer to camera (30-50cm)
3. Ensure face is fully visible
4. Clean camera lens

### "Results seem wrong"
1. Check console for lighting quality
2. Try in brighter room
3. Hold expression longer (full 4 seconds)
4. Ensure clear, distinct expression

### "Results vary a lot"
- This is normal! Small head movements cause variation
- Hold your head still
- Keep expression consistent throughout 4 seconds

---

## 📱 Browser Requirements

- Modern browser (Chrome, Firefox, Safari, Edge)
- Webcam permission granted
- JavaScript enabled
- At least 100MB RAM

---

## 🎯 Pro Tips

1. **Test Each Emotion Separately**
   - Record yourself smiling → should show Happy
   - Record yourself frowning → should show Sad
   - This validates your conditions are good

2. **Watch Console Output**
   - See all 40 frames processed
   - Check lighting feedback
   - Monitor per-frame confidence scores

3. **Optimal Position**
   - Forehead to chin fills 50% of frame
   - Eyes centered horizontally
   - Good lighting from front (not side shadows)

4. **Timing Matters**
   - Hold expression throughout 4-second recording
   - Don't move face
   - Don't blink excessively

---

## 📚 Learn More

For detailed information:
- **EMOTION_DETECTION_EXPLAINED.md** - Full technical guide
- **HOW_EMOTION_DETECTION_WORKS.md** - How the system works
- **ACCURACY_IMPROVEMENTS.md** - What we optimized

---

## 🔬 Why This Matters

Your emotion detection system is **multimodal**:
- **Face** - Visual expression (what this guide covers)
- **Voice** - Tone, pitch, emotions
- **Text** - What you say sentiment

Combined = Much more accurate than face alone!

---

**Version:** 1.0  
**Last Updated:** Today  
**Status:** Ready to use ✅
