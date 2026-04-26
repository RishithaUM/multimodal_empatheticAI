import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { FusedResult, ModalityResult } from '@/services/emotionApi';
import { fuseEmotions } from '@/services/emotionApi';

const MOCK_FUSED: FusedResult = {
  emotion: 'Happy',
  confidence: 92,
  intensity: 78,
  intensityLabel: 'High',
  modalities: [
    { modality: 'face', emotion: 'Happy', confidence: 89, scores: [{ emotion: 'Happy', confidence: 89 }, { emotion: 'Neutral', confidence: 11 }] },
    { modality: 'voice', emotion: 'Excited', confidence: 76, scores: [{ emotion: 'Excited', confidence: 76 }, { emotion: 'Happy', confidence: 24 }] },
    { modality: 'text', emotion: 'Happy', confidence: 91, scores: [{ emotion: 'Happy', confidence: 91 }, { emotion: 'Neutral', confidence: 9 }] },
  ],
  fusionWeights: { face: 45, voice: 35, text: 20 },
  timestamp: Date.now(),
};

const emotionColors: Record<string, string> = {
  Happy: '#00D4AA',
  Excited: '#EC4899',
  Calm: '#3B82F6',
  Sad: '#6C63FF',
  Anxious: '#F59E0B',
  Angry: '#EF4444',
  Neutral: '#94A3B8',
  Fearful: '#8B5CF6',
  Disgusted: '#10B981',
  Surprised: '#F97316',
};

const emotionEmoji: Record<string, string> = {
  Happy: '😊', Excited: '🤩', Calm: '😌', Sad: '😢',
  Anxious: '😰', Angry: '😠', Neutral: '😐', Fearful: '😨',
  Disgusted: '🤢', Surprised: '😲',
};

const modalityIconMap: Record<string, string> = {
  face: 'ri-camera-line', voice: 'ri-mic-line', text: 'ri-chat-3-line',
};
const modalityColorMap: Record<string, string> = {
  face: '#6C63FF', voice: '#00D4AA', text: '#EC4899',
};

function generateInsights(fused: FusedResult): string[] {
  const { emotion, confidence, intensityLabel, modalities } = fused;
  const insights: string[] = [];
  if (confidence > 80) {
    insights.push(`High-confidence ${emotion.toLowerCase()} state detected across ${modalities.length} modalit${modalities.length > 1 ? 'ies' : 'y'}.`);
  } else {
    insights.push(`Moderate confidence in ${emotion.toLowerCase()} — consider adding more input modalities for accuracy.`);
  }
  if (modalities.length > 1) {
    const allAgree = modalities.every((m) => m.emotion === emotion);
    if (allAgree) {
      insights.push('All modalities agree on the detected emotion, strengthening result reliability.');
    } else {
      const dominant = [...modalities].sort((a, b) => b.confidence - a.confidence)[0];
      insights.push(`${dominant.modality.charAt(0).toUpperCase() + dominant.modality.slice(1)} was the strongest signal at ${dominant.confidence}% confidence.`);
    }
  }
  if (intensityLabel === 'High') {
    insights.push(`Intensity is high (${fused.intensity}%) — this emotional state is strongly expressed.`);
  } else if (intensityLabel === 'Low') {
    insights.push('Low intensity suggests a mild or subdued emotional expression.');
  }
  if (['Anxious', 'Sad', 'Angry', 'Fearful'].includes(emotion)) {
    insights.push('Negative emotional patterns detected. Consider mindfulness or speaking with someone you trust.');
  } else if (['Happy', 'Excited', 'Calm'].includes(emotion)) {
    insights.push('Positive emotional state — a great time for creative or social activities.');
  }
  return insights;
}

function generateRecommendations(emotion: string): string[] {
  const map: Record<string, string[]> = {
    Happy: [
      'Channel this energy into creative or collaborative work.',
      'Share your positive mood — it\'s contagious and uplifting.',
      'Journal this moment to reinforce emotional awareness.',
      'Use this state to tackle challenging tasks with enthusiasm.',
    ],
    Excited: [
      'Direct your excitement toward a meaningful goal.',
      'Take a moment to ground yourself before making big decisions.',
      'Share your enthusiasm with others to amplify the energy.',
    ],
    Calm: [
      'This is an ideal state for deep focus and reflection.',
      'Consider meditation or journaling to deepen this calm.',
      'Use this clarity to plan or make important decisions.',
    ],
    Sad: [
      'Reach out to a trusted friend or family member.',
      'Engage in gentle physical activity like a walk.',
      'Practice self-compassion — it\'s okay to feel this way.',
      'Consider speaking with a mental health professional if this persists.',
    ],
    Anxious: [
      'Try the 4-7-8 breathing technique to calm your nervous system.',
      'Break overwhelming tasks into smaller, manageable steps.',
      'Limit caffeine and screen time for the next hour.',
      'Consider reaching out to your guardian or a counselor.',
    ],
    Angry: [
      'Step away from the triggering situation temporarily.',
      'Physical exercise can help release built-up tension.',
      'Write down your feelings before responding to others.',
    ],
    Fearful: [
      'Identify the specific source of fear and assess its reality.',
      'Ground yourself using the 5-4-3-2-1 sensory technique.',
      'Talk to someone you trust about what you\'re experiencing.',
    ],
    Neutral: [
      'This is a balanced state — good for routine tasks.',
      'Consider what might bring more engagement or joy to your day.',
    ],
    // canonical labels
    angry: [
      'Step away from the triggering situation temporarily.',
      'Physical exercise can help release built-up tension.',
      'Write down your feelings before responding to others.',
    ],
    disgusted: [
      'Distance yourself from the source of disgust.',
      'Practice mindful breathing to reset your senses.',
      'Engage with something aesthetically pleasing to you.',
    ],
    fearful: [
      'Identify the specific source of fear and assess its reality.',
      'Ground yourself using the 5-4-3-2-1 sensory technique.',
      'Talk to someone you trust about what you\'re experiencing.',
    ],
    happy: [
      'Channel this energy into creative or collaborative work.',
      'Share your positive mood — it\'s contagious and uplifting.',
      'Journal this moment to reinforce emotional awareness.',
    ],
    neutral: [
      'This is a balanced state — good for routine tasks.',
      'Consider what might bring more engagement or joy to your day.',
    ],
    sad: [
      'Reach out to a trusted friend or family member.',
      'Engage in gentle physical activity like a walk.',
      'Practice self-compassion — it\'s okay to feel this way.',
    ],
    surprised: [
      'Pause and process what just happened before reacting.',
      'Channel your surprise into curiosity and exploration.',
      'Reflect on what this unexpected moment reveals.',
    ],
  };
  return map[emotion] || map.neutral;
}

interface VideoLink { title: string; url: string; }
interface VideoRecs { goal: string; videos: VideoLink[]; }

function generateFusionExplanation(fused: FusedResult): string {
  const { modalities, fusionWeights, emotion } = fused;
  if (modalities.length === 0) return 'No modalities were analyzed.';
  if (modalities.length === 1) {
    const m = modalities[0];
    return `The final emotion was determined solely from ${m.modality} analysis, which detected ${m.emotion} with ${m.confidence}% confidence.`;
  }
  const parts = modalities.map((m) => {
    const w = fusionWeights[m.modality] || 0;
    return `${m.modality} (${w}% weight, ${m.confidence}% confidence → ${m.emotion})`;
  });
  return `The final emotion "${emotion}" was determined by weighted fusion of ${modalities.length} modalities: ${parts.join(', ')}. Each modality\'s confidence score was multiplied by its assigned weight, and the emotion with the highest weighted vote was selected as the final result.`;
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const locationState = location.state as { fused?: FusedResult; modalities?: ModalityResult[] } | null;
  const fused: FusedResult = locationState?.fused
    ? locationState.fused
    : locationState?.modalities?.length
    ? fuseEmotions(locationState.modalities)
    : MOCK_FUSED;

  const emotionColor = emotionColors[fused.emotion] || '#6C63FF';
  const intensityColor = fused.intensityLabel === 'High' ? '#00D4AA' : fused.intensityLabel === 'Medium' ? '#F59E0B' : '#3B82F6';
  const insights = generateInsights(fused);
  const recommendations = generateRecommendations(fused.emotion);
  const [videoRecs, setVideoRecs] = useState<VideoRecs | null>(null);
  const [videoRecsLoading, setVideoRecsLoading] = useState(true);
  const fusionExplanation = generateFusionExplanation(fused);

  useEffect(() => {
    const emotion = fused.emotion.toLowerCase();
    setVideoRecsLoading(true);
    fetch('http://localhost:5000/api/emotion/youtube-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotion }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.videos)) {
          setVideoRecs({ goal: `${emotion} support`, videos: data.videos });
        }
      })
      .catch(() => { /* silently fail — no fallback shown */ })
      .finally(() => setVideoRecsLoading(false));
  }, [fused.emotion]);
  const isRealData = !!locationState?.fused || !!locationState?.modalities;
  const emoji = emotionEmoji[fused.emotion] || '🧠';
  const reportDate = new Date(fused.timestamp).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ml = 18; // margin left
      const mr = 18; // margin right
      const cw = pageW - ml - mr; // content width

      const ec = hexToRgb(emotionColor) ?? { r: 0, g: 212, b: 170 };
      const ic = hexToRgb(intensityColor) ?? { r: 0, g: 212, b: 170 };

      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 1
      // ─────────────────────────────────────────────────────────────────────────

      // ── Full-width header with accent color left stripe ───────────────────────
      doc.setFillColor(248, 249, 252);
      doc.rect(0, 0, pageW, pageH, 'F'); // white page bg

      // Top header bar
      doc.setFillColor(15, 15, 22);
      doc.rect(0, 0, pageW, 52, 'F');

      // Left accent stripe
      doc.setFillColor(ec.r, ec.g, ec.b);
      doc.rect(0, 0, 5, 52, 'F');

      // Brand name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('EmpathAI', ml + 2, 20);

      // Tagline
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(180, 190, 210);
      doc.text('Multimodal Emotion Intelligence Report', ml + 2, 29);

      // Date & session info
      doc.setFontSize(8);
      doc.setTextColor(130, 145, 170);
      doc.text(`Generated: ${reportDate}`, ml + 2, 38);
      doc.text(`Session ID: EMP-${fused.timestamp.toString().slice(-8)}`, ml + 2, 45);

      // Badge top-right
      const badgeLabel = isRealData ? 'LIVE DETECTION' : 'DEMO DATA';
      const badgeRgb = isRealData ? { r: 0, g: 212, b: 170 } : { r: 245, g: 158, b: 11 };
      doc.setFillColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
      doc.roundedRect(pageW - mr - 36, 18, 36, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(10, 10, 15);
      doc.text(badgeLabel, pageW - mr - 18, 24.5, { align: 'center' });

      // ── SECTION 1: Primary Emotion ────────────────────────────────────────────
      let y = 62;

      // Section label
      pdfSectionLabel(doc, '01  PRIMARY EMOTION', ml, y, ec);
      y += 10;

      // Big emotion card — white with colored left border
      const cardH = 52;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(ml, y, cw, cardH, 3, 3, 'F');
      doc.setFillColor(ec.r, ec.g, ec.b);
      doc.roundedRect(ml, y, 4, cardH, 2, 2, 'F');

      // Emotion name — large
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(32);
      doc.setTextColor(ec.r, ec.g, ec.b);
      doc.text(fused.emotion, ml + 12, y + 22);

      // Sub label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 130, 150);
      doc.text('Primary Detected Emotion', ml + 12, y + 30);

      // Confidence pill
      doc.setFillColor(ec.r, ec.g, ec.b);
      doc.roundedRect(ml + 12, y + 34, 38, 9, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`${fused.confidence}% Confidence`, ml + 31, y + 40, { align: 'center' });

      // Right side — intensity
      const rightX = ml + cw - 70;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 150);
      doc.text('INTENSITY', rightX, y + 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(ic.r, ic.g, ic.b);
      doc.text(fused.intensityLabel, rightX, y + 26);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 150);
      doc.text(`${fused.intensity}% expressed`, rightX, y + 33);

      // Intensity bar
      doc.setFillColor(230, 232, 238);
      doc.roundedRect(rightX, y + 37, 58, 5, 1.5, 1.5, 'F');
      doc.setFillColor(ic.r, ic.g, ic.b);
      doc.roundedRect(rightX, y + 37, 58 * (fused.intensity / 100), 5, 1.5, 1.5, 'F');

      y += cardH + 10;

      // ── SECTION 2: Modality Breakdown ─────────────────────────────────────────
      pdfSectionLabel(doc, '02  MODALITY BREAKDOWN', ml, y, ec);
      y += 10;

      // 3-column modality cards
      const colW = (cw - 8) / Math.max(fused.modalities.length, 1);
      fused.modalities.forEach((m, idx) => {
        const mc = hexToRgb(modalityColorMap[m.modality] ?? '#6C63FF') ?? { r: 108, g: 99, b: 255 };
        const label = m.modality.charAt(0).toUpperCase() + m.modality.slice(1);
        const weight = fused.fusionWeights[m.modality] ?? 0;
        const cx = ml + idx * (colW + 4);
        const mCardH = 46;

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx, y, colW, mCardH, 3, 3, 'F');

        // top accent
        doc.setFillColor(mc.r, mc.g, mc.b);
        doc.roundedRect(cx, y, colW, 3, 1.5, 1.5, 'F');

        // modality name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 35, 50);
        doc.text(label, cx + 6, y + 12);

        // detected emotion
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(mc.r, mc.g, mc.b);
        doc.text(m.emotion, cx + 6, y + 20);

        // confidence number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(30, 35, 50);
        doc.text(`${m.confidence}%`, cx + 6, y + 33);

        // weight label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(140, 150, 170);
        doc.text(`Weight: ${weight}%`, cx + 6, y + 40);

        // mini bar
        doc.setFillColor(230, 232, 238);
        doc.roundedRect(cx + colW - 22, y + 26, 16, 3, 1, 1, 'F');
        doc.setFillColor(mc.r, mc.g, mc.b);
        doc.roundedRect(cx + colW - 22, y + 26, 16 * (m.confidence / 100), 3, 1, 1, 'F');
      });

      y += 56;

      // Fusion weight stacked bar
      if (fused.modalities.length > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 130, 150);
        doc.text('FUSION WEIGHT DISTRIBUTION', ml, y);
        y += 5;

        doc.setFillColor(230, 232, 238);
        doc.roundedRect(ml, y, cw, 8, 2, 2, 'F');

        let bx = ml;
        fused.modalities.forEach((m) => {
          const w = fused.fusionWeights[m.modality] ?? 0;
          const segW = cw * (w / 100);
          const mc = hexToRgb(modalityColorMap[m.modality] ?? '#6C63FF') ?? { r: 108, g: 99, b: 255 };
          doc.setFillColor(mc.r, mc.g, mc.b);
          doc.rect(bx, y, segW, 8, 'F');
          bx += segW;
        });
        // round corners overlay trick — just redraw border
        doc.setDrawColor(230, 232, 238);
        doc.setLineWidth(0);

        y += 12;
        // legend
        let lx = ml;
        fused.modalities.forEach((m) => {
          const w = fused.fusionWeights[m.modality] ?? 0;
          const mc = hexToRgb(modalityColorMap[m.modality] ?? '#6C63FF') ?? { r: 108, g: 99, b: 255 };
          doc.setFillColor(mc.r, mc.g, mc.b);
          doc.circle(lx + 2, y - 1, 2, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(60, 70, 90);
          doc.text(`${m.modality.charAt(0).toUpperCase() + m.modality.slice(1)}: ${w}%`, lx + 6, y + 0.5);
          lx += 42;
        });
        y += 10;
      }

      // ── SECTION 3: Confidence Score Breakdown ─────────────────────────────────
      y += 4;
      pdfSectionLabel(doc, '03  CONFIDENCE SCORE BREAKDOWN', ml, y, ec);
      y += 10;

      // Horizontal bar chart for each modality
      fused.modalities.forEach((m) => {
        const mc = hexToRgb(modalityColorMap[m.modality] ?? '#6C63FF') ?? { r: 108, g: 99, b: 255 };
        const label = m.modality.charAt(0).toUpperCase() + m.modality.slice(1);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 35, 50);
        doc.text(label, ml, y + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(120, 130, 150);
        doc.text(m.emotion, ml + 22, y + 4);

        // bar track
        const barStartX = ml + 60;
        const barTrackW = cw - 75;
        doc.setFillColor(230, 232, 238);
        doc.roundedRect(barStartX, y, barTrackW, 7, 2, 2, 'F');

        // bar fill
        doc.setFillColor(mc.r, mc.g, mc.b);
        doc.roundedRect(barStartX, y, barTrackW * (m.confidence / 100), 7, 2, 2, 'F');

        // percentage label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(mc.r, mc.g, mc.b);
        doc.text(`${m.confidence}%`, pageW - mr, y + 5.5, { align: 'right' });

        y += 12;
      });

      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 2
      // ─────────────────────────────────────────────────────────────────────────
      doc.addPage();
      doc.setFillColor(248, 249, 252);
      doc.rect(0, 0, pageW, pageH, 'F');

      // Thin top accent bar on page 2
      doc.setFillColor(ec.r, ec.g, ec.b);
      doc.rect(0, 0, pageW, 3, 'F');

      // Page 2 header
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 3, pageW, 18, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(ec.r, ec.g, ec.b);
      doc.text('EmpathAI', ml, 14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 160, 180);
      doc.text('Emotion Analysis Report — Continued', ml + 22, 14);
      doc.setTextColor(180, 185, 200);
      doc.text(reportDate, pageW - mr, 14, { align: 'right' });

      // divider
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.3);
      doc.line(ml, 21, pageW - mr, 21);

      y = 30;

      // ── SECTION 4: AI Insights ────────────────────────────────────────────────
      pdfSectionLabel(doc, '04  AI INSIGHTS', ml, y, ec);
      y += 10;

      insights.forEach((insight, i) => {
        const lines = doc.splitTextToSize(insight, cw - 20);
        const blockH = lines.length * 5.5 + 12;

        // card
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(ml, y, cw, blockH, 3, 3, 'F');

        // left accent dot
        doc.setFillColor(ec.r, ec.g, ec.b);
        doc.circle(ml + 7, y + blockH / 2, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`${i + 1}`, ml + 7, y + blockH / 2 + 1, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(40, 50, 70);
        doc.text(lines, ml + 16, y + 8);

        y += blockH + 4;
      });

      y += 6;

      // ── SECTION 5: Recommendations ────────────────────────────────────────────
      pdfSectionLabel(doc, '05  PERSONALIZED RECOMMENDATIONS', ml, y, ec);
      y += 10;

      recommendations.forEach((rec, i) => {
        const lines = doc.splitTextToSize(rec, cw - 22);
        const blockH = lines.length * 5.5 + 12;

        if (y + blockH > pageH - 30) {
          doc.addPage();
          doc.setFillColor(248, 249, 252);
          doc.rect(0, 0, pageW, pageH, 'F');
          doc.setFillColor(ec.r, ec.g, ec.b);
          doc.rect(0, 0, pageW, 3, 'F');
          y = 16;
        }

        // card with pink accent
        const rc = { r: 236, g: 72, b: 153 };
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(ml, y, cw, blockH, 3, 3, 'F');

        // number badge
        doc.setFillColor(rc.r, rc.g, rc.b);
        doc.roundedRect(ml + 4, y + (blockH - 8) / 2, 8, 8, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`${i + 1}`, ml + 8, y + (blockH - 8) / 2 + 5.5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(40, 50, 70);
        doc.text(lines, ml + 16, y + 8);

        y += blockH + 4;
      });

      y += 6;

      // ── SECTION 6: How the Result Was Computed ────────────────────────────────
      if (y + 40 > pageH - 30) {
        doc.addPage();
        doc.setFillColor(248, 249, 252);
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setFillColor(ec.r, ec.g, ec.b);
        doc.rect(0, 0, pageW, 3, 'F');
        y = 16;
      }

      pdfSectionLabel(doc, '06  HOW THE RESULT WAS COMPUTED', ml, y, ec);
      y += 10;

      const expLines = doc.splitTextToSize(fusionExplanation, cw - 10);
      const expH = expLines.length * 5.5 + 14;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(ml, y, cw, expH, 3, 3, 'F');

      // left accent bar
      doc.setFillColor(ec.r, ec.g, ec.b);
      doc.roundedRect(ml, y, 3, expH, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 60, 80);
      doc.text(expLines, ml + 8, y + 9);

      y += expH + 10;

      // ── Summary stats row ─────────────────────────────────────────────────────
      if (y + 28 > pageH - 30) {
        doc.addPage();
        doc.setFillColor(248, 249, 252);
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setFillColor(ec.r, ec.g, ec.b);
        doc.rect(0, 0, pageW, 3, 'F');
        y = 16;
      }

      const stats = [
        { label: 'Emotion', value: fused.emotion, color: ec },
        { label: 'Confidence', value: `${fused.confidence}%`, color: ec },
        { label: 'Intensity', value: `${fused.intensityLabel} (${fused.intensity}%)`, color: ic },
        { label: 'Modalities', value: `${fused.modalities.length} analyzed`, color: { r: 108, g: 99, b: 255 } },
      ];

      const statW = (cw - 9) / 4;
      stats.forEach((s, i) => {
        const sx = ml + i * (statW + 3);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(sx, y, statW, 24, 3, 3, 'F');
        doc.setFillColor(s.color.r, s.color.g, s.color.b);
        doc.roundedRect(sx, y, statW, 3, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(130, 140, 160);
        doc.text(s.label.toUpperCase(), sx + 5, y + 10);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 35, 50);
        doc.text(s.value, sx + 5, y + 19);
      });

      y += 32;

      // ── Footer on all pages ───────────────────────────────────────────────────
      const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // footer bar
        doc.setFillColor(15, 15, 22);
        doc.rect(0, pageH - 12, pageW, 12, 'F');
        doc.setFillColor(ec.r, ec.g, ec.b);
        doc.rect(0, pageH - 12, 4, 12, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(130, 145, 170);
        doc.text('EmpathAI · Confidential Emotion Intelligence Report · empathAI.app', ml + 2, pageH - 4.5);
        doc.setTextColor(ec.r, ec.g, ec.b);
        doc.text(`Page ${p} of ${totalPages}`, pageW - mr, pageH - 4.5, { align: 'right' });
      }

      doc.save(`EmpathAI-Report-${fused.timestamp}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    setSaved(true);
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const modalitiesPayload: Record<string, unknown> = {};
        fused.modalities.forEach((m) => {
          modalitiesPayload[m.modality] = {
            emotion: m.emotion,
            confidence: m.confidence / 100,
            scores: m.scores,
          };
        });
        await fetch('http://localhost:5000/api/emotion/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            face_emotion: modalitiesPayload['face'] || null,
            voice_emotion: modalitiesPayload['voice'] || null,
            text_emotion: modalitiesPayload['text'] || null,
            weights: fused.fusionWeights,
            metadata: { saved_from: 'results_page', timestamp: fused.timestamp },
          }),
        });
      } catch (err) {
        console.error('Save to history failed:', err);
      }
    } else {
      // No auth — persist to localStorage so history page can read it
      try {
        const existing: unknown[] = JSON.parse(localStorage.getItem('empathAI_history') || '[]');
        existing.unshift({ ...fused, savedAt: Date.now() });
        localStorage.setItem('empathAI_history', JSON.stringify(existing.slice(0, 50)));
      } catch (err) {
        console.error('localStorage save failed:', err);
      }
    }
    setTimeout(() => navigate('/history'), 800);
  };

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Analysis Results
            </h1>
            {isRealData ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.25)' }}>
                Real Detection
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                Demo Data
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">{reportDate}</p>
        </div>
        <button
          onClick={() => navigate('/analyze')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-300 cursor-pointer whitespace-nowrap transition-all hover:text-white hover:border-white/20"
          style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-refresh-line text-sm"></i>
          </div>
          New Analysis
        </button>
      </div>

      {/* ── Report Content ── */}
      <div ref={reportRef} className="space-y-5">

        {/* ── Hero Emotion Card ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 lg:p-8"
          style={{ background: '#13131A', border: `1px solid ${emotionColor}25` }}
        >
          {/* glow blob */}
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10 pointer-events-none"
            style={{ background: emotionColor, filter: 'blur(60px)' }}
          />

          <div className="relative flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Circular gauge */}
            <div className="flex-shrink-0 relative w-44 h-44">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 176 176">
                <circle cx="88" cy="88" r="72" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle
                  cx="88" cy="88" r="72"
                  fill="none"
                  stroke={emotionColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 72}`}
                  strokeDashoffset={`${2 * Math.PI * 72 * (1 - fused.confidence / 100)}`}
                  style={{ filter: `drop-shadow(0 0 12px ${emotionColor}80)`, transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl mb-1">{emoji}</span>
                <span className="text-2xl font-black text-white">{fused.confidence}%</span>
                <span className="text-xs text-gray-400">confidence</span>
              </div>
            </div>

            {/* Emotion info */}
            <div className="flex-1 text-center lg:text-left">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Primary Emotion</p>
              <h2 className="text-5xl font-black mb-3" style={{ color: emotionColor, fontFamily: 'Sora, sans-serif', textShadow: `0 0 40px ${emotionColor}40` }}>
                {fused.emotion}
              </h2>

              {/* Intensity */}
              <div className="flex items-center gap-3 mb-4 justify-center lg:justify-start">
                <span className="text-gray-400 text-sm">Intensity</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: `${intensityColor}18`, color: intensityColor, border: `1px solid ${intensityColor}30` }}>
                  {fused.intensityLabel}
                </span>
                <span className="text-gray-400 text-sm">{fused.intensity}%</span>
              </div>

              {/* Intensity bar */}
              <div className="w-full max-w-xs mx-auto lg:mx-0 h-2 rounded-full mb-5" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${fused.intensity}%`, background: `linear-gradient(to right, ${intensityColor}60, ${intensityColor})` }}
                />
              </div>

              {/* Modality pills */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {fused.modalities.map((m) => {
                  const color = modalityColorMap[m.modality] || '#6C63FF';
                  const icon = modalityIconMap[m.modality] || 'ri-question-line';
                  return (
                    <div
                      key={m.modality}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                    >
                      <div className="w-3 h-3 flex items-center justify-center">
                        <i className={`${icon} text-xs`}></i>
                      </div>
                      {m.modality.charAt(0).toUpperCase() + m.modality.slice(1)} · {m.confidence}%
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${emotionColor}CC, ${emotionColor})`, minWidth: '160px' }}
              >
                {downloading ? (
                  <>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-loader-4-line animate-spin text-sm"></i>
                    </div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-file-pdf-line text-sm"></i>
                    </div>
                    Download PDF
                  </>
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={saved}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all hover:border-white/20 active:scale-95"
                style={{
                  background: saved ? 'rgba(0,212,170,0.1)' : '#1C1C28',
                  border: `1px solid ${saved ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: saved ? '#00D4AA' : '#fff',
                  minWidth: '160px',
                }}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={`${saved ? 'ri-check-line' : 'ri-bookmark-line'} text-sm`}></i>
                </div>
                {saved ? 'Saved!' : 'Save to History'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 3-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Modality Breakdown */}
          <div className="rounded-2xl p-5" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)' }}>
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-pie-chart-2-line text-sm" style={{ color: '#6C63FF' }}></i>
                </div>
              </div>
              <p className="text-white text-sm font-semibold">Modality Breakdown</p>
            </div>

            {fused.modalities.length === 0 ? (
              <p className="text-gray-500 text-sm">No modalities analyzed.</p>
            ) : (
              <div className="space-y-4">
                {fused.modalities.map((m) => {
                  const icon = modalityIconMap[m.modality] || 'ri-question-line';
                  const color = modalityColorMap[m.modality] || '#6C63FF';
                  const label = m.modality.charAt(0).toUpperCase() + m.modality.slice(1);
                  const weight = fused.fusionWeights[m.modality] || 0;
                  return (
                    <div key={m.modality} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                            <div className="w-3.5 h-3.5 flex items-center justify-center">
                              <i className={`${icon} text-xs`} style={{ color }}></i>
                            </div>
                          </div>
                          <div>
                            <p className="text-white text-xs font-semibold">{label}</p>
                            <p className="text-gray-500 text-xs">{m.emotion}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color }}>{m.confidence}%</p>
                          <p className="text-gray-600 text-xs">wt {weight}%</p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.confidence}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fusion weight bar */}
            {fused.modalities.length > 1 && (
              <div className="mt-4">
                <p className="text-gray-500 text-xs mb-2">Fusion Weights</p>
                <div className="flex rounded-lg overflow-hidden h-2">
                  {fused.modalities.map((m) => (
                    <div
                      key={m.modality}
                      style={{ width: `${fused.fusionWeights[m.modality] || 0}%`, background: modalityColorMap[m.modality] || '#6C63FF' }}
                      title={`${m.modality}: ${fused.fusionWeights[m.modality]}%`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1.5">
                  {fused.modalities.map((m) => (
                    <span key={m.modality} className="text-xs" style={{ color: modalityColorMap[m.modality] || '#6C63FF' }}>
                      {m.modality.charAt(0).toUpperCase() + m.modality.slice(1)} {fused.fusionWeights[m.modality]}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="rounded-2xl p-5" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-brain-line text-sm" style={{ color: '#00D4AA' }}></i>
                </div>
              </div>
              <p className="text-white text-sm font-semibold">AI Insights</p>
            </div>
            <ul className="space-y-3">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.08)' }}>
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-lightbulb-flash-line text-sm" style={{ color: '#00D4AA' }}></i>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{insight}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="rounded-2xl p-5" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)' }}>
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-compass-3-line text-sm" style={{ color: '#EC4899' }}></i>
                </div>
              </div>
              <p className="text-white text-sm font-semibold">Recommendations</p>
            </div>
            <ul className="space-y-3">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.08)' }}>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                    style={{ background: 'rgba(236,72,153,0.2)', color: '#EC4899' }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">{rec}</p>
                </li>
              ))}
            </ul>

            {/* YouTube video suggestions */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,0,0,0.15)' }}>
                  <i className="ri-youtube-line text-xs" style={{ color: '#FF4444' }}></i>
                </div>
                <p className="text-white text-xs font-semibold">Watch to Help</p>
                <span className="text-gray-500 text-xs ml-auto">AI-curated for you</span>
              </div>
              {videoRecsLoading ? (
                <div className="flex items-center gap-2 py-3 text-gray-500 text-xs">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Asking AI for suggestions…
                </div>
              ) : videoRecs && videoRecs.videos.length > 0 ? (
                <div className="space-y-2">
                  {videoRecs.videos.map((v, i) => (
                    <a
                      key={i}
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all hover:opacity-80"
                      style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.12)', color: '#FCA5A5', textDecoration: 'none' }}
                    >
                      <i className="ri-play-circle-line text-sm flex-shrink-0" style={{ color: '#FF4444' }}></i>
                      {v.title}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-xs">Suggestions unavailable — Ollama may be offline.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Fusion Explanation ── */}
        <div className="rounded-2xl p-5" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,99,255,0.15)' }}>
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-cpu-line text-sm" style={{ color: '#6C63FF' }}></i>
              </div>
            </div>
            <p className="text-white text-sm font-semibold">How the Result Was Computed</p>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{fusionExplanation}</p>
        </div>

      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function pdfSectionLabel(
  doc: import('jspdf').jsPDF,
  title: string,
  x: number,
  y: number,
  accentColor: { r: number; g: number; b: number },
): void {
  // pill background
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.roundedRect(x, y - 1, 3, 7, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text(title, x + 6, y + 5);

  // divider line
  const textW = doc.getTextWidth(title);
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(x + 6 + textW + 4, y + 3, x + 172, y + 3);
}
