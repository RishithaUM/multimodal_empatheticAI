# Voice Emotion Phrases (Model-Aligned)

This guide is tuned for the currently loaded voice classifier labels:
- anger
- disgust
- fear
- happiness
- sadness

If you use phrases outside these classes (for example neutral or surprise), results may be forced into the closest class.

## Recording setup (important)

- Record 3 to 5 seconds per phrase.
- Keep mic distance fixed (about 15 to 25 cm).
- Start speaking after 0.5s silence, end with 0.5s silence.
- Test in a quiet room.
- Repeat each phrase 3 times and use the average result.

## Happiness

How to talk:
- Tone: bright and friendly
- Pitch: medium-high
- Pace: medium-fast
- Volume: medium
- Delivery: smile while speaking, upward intonation at phrase end
Phrases:
- This is the best news I have heard today.
- I am genuinely happy and excited right now.
- We did it, I am so proud of this.
- That made my day, I feel wonderful.

## Sadness

How to talk:
- Tone: soft and heavy
- Pitch: low
- Pace: slow
- Volume: low-medium
- Delivery: longer pauses, flatter ending

Phrases:
- I feel really low and tired today.
- Nothing is working and I feel hopeless.
- I am disappointed and emotionally drained.
- I do not have the energy to continue.

## Anger

How to talk:
- Tone: tense and sharp
- Pitch: medium with bursts
- Pace: medium-fast
- Volume: medium-high
- Delivery: stress key words, short clipped phrasing

Phrases:
- This is unacceptable and I am very angry.
- Stop this now, I have had enough.
- I am furious about what just happened.
- Do not do that again, understand me.

## Fear

How to talk:
- Tone: shaky and uncertain
- Pitch: higher with variation
- Pace: uneven (small hesitations)
- Volume: low-medium
- Delivery: include breaths and slight tremble

Phrases:
- I am scared that something bad will happen.
- I do not feel safe right now.
- I am worried and my hands are shaking.
- Please stay with me, I am afraid.

## Disgust

How to talk:
- Tone: rejecting and compressed
- Pitch: medium-low
- Pace: medium
- Volume: medium
- Delivery: slight grimace voice, downward emphasis

Phrases:
- That is disgusting, I cannot stand it.
- This smells terrible and makes me sick.
- That was gross and deeply unpleasant.
- I feel sick just looking at that.

## High-accuracy test protocol

Read this exact script in one session:
- Happiness: This is the best news I have heard today.
- Sadness: I feel really low and tired today.
- Anger: This is unacceptable and I am very angry.
- Fear: I am scared that something bad will happen.
- Disgust: That is disgusting, I cannot stand it.

For each line:
- Record 3 takes.
- Keep speaking style consistent.
- Compare the top class and confidence trend, not one single run.

## Common mistakes that reduce accuracy

- Speaking too quietly for all emotions.
- Using the same tone for every phrase.
- Too much background noise or echo.
- Very long recordings with mixed emotions.
- Reading with robotic monotone.
