import type { FusedResult } from '@/services/emotionApi';

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

const modalityColorMap: Record<string, string> = {
  face: '#6C63FF',
  voice: '#00D4AA',
  text: '#EC4899',
};

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
  doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  doc.roundedRect(x, y - 1, 3, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  doc.text(title, x + 6, y + 5);
  const textW = doc.getTextWidth(title);
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(x + 6 + textW + 4, y + 3, x + 172, y + 3);
}

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
  };
  return map[emotion] || map.Neutral;
}

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

export async function downloadEmotionPDF(fused: FusedResult, isRealData = false): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ml = 18;
  const mr = 18;
  const cw = pageW - ml - mr;

  const emotionColor = emotionColors[fused.emotion] || '#6C63FF';
  const intensityColor = fused.intensityLabel === 'High' ? '#00D4AA' : fused.intensityLabel === 'Medium' ? '#F59E0B' : '#3B82F6';

  const ec = hexToRgb(emotionColor) ?? { r: 0, g: 212, b: 170 };
  const ic = hexToRgb(intensityColor) ?? { r: 0, g: 212, b: 170 };

  const insights = generateInsights(fused);
  const recommendations = generateRecommendations(fused.emotion);
  const fusionExplanation = generateFusionExplanation(fused);

  const reportDate = new Date(fused.timestamp).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 249, 252);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Header bar
  doc.setFillColor(15, 15, 22);
  doc.rect(0, 0, pageW, 52, 'F');
  doc.setFillColor(ec.r, ec.g, ec.b);
  doc.rect(0, 0, 5, 52, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('EmpathAI', ml + 2, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 190, 210);
  doc.text('Multimodal Emotion Intelligence Report', ml + 2, 29);

  doc.setFontSize(8);
  doc.setTextColor(130, 145, 170);
  doc.text(`Generated: ${reportDate}`, ml + 2, 38);
  doc.text(`Session ID: EMP-${fused.timestamp.toString().slice(-8)}`, ml + 2, 45);

  const badgeLabel = isRealData ? 'LIVE DETECTION' : 'DEMO DATA';
  const badgeRgb = isRealData ? { r: 0, g: 212, b: 170 } : { r: 245, g: 158, b: 11 };
  doc.setFillColor(badgeRgb.r, badgeRgb.g, badgeRgb.b);
  doc.roundedRect(pageW - mr - 36, 18, 36, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(10, 10, 15);
  doc.text(badgeLabel, pageW - mr - 18, 24.5, { align: 'center' });

  // ── Section 1: Primary Emotion ───────────────────────────────────────────────
  let y = 62;
  pdfSectionLabel(doc, '01  PRIMARY EMOTION', ml, y, ec);
  y += 10;

  const cardH = 52;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(ml, y, cw, cardH, 3, 3, 'F');
  doc.setFillColor(ec.r, ec.g, ec.b);
  doc.roundedRect(ml, y, 4, cardH, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(ec.r, ec.g, ec.b);
  doc.text(fused.emotion, ml + 12, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 130, 150);
  doc.text('Primary Detected Emotion', ml + 12, y + 30);

  doc.setFillColor(ec.r, ec.g, ec.b);
  doc.roundedRect(ml + 12, y + 34, 38, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${fused.confidence}% Confidence`, ml + 31, y + 40, { align: 'center' });

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

  doc.setFillColor(230, 232, 238);
  doc.roundedRect(rightX, y + 37, 58, 5, 1.5, 1.5, 'F');
  doc.setFillColor(ic.r, ic.g, ic.b);
  doc.roundedRect(rightX, y + 37, 58 * (fused.intensity / 100), 5, 1.5, 1.5, 'F');

  y += cardH + 10;

  // ── Section 2: Modality Breakdown ────────────────────────────────────────────
  pdfSectionLabel(doc, '02  MODALITY BREAKDOWN', ml, y, ec);
  y += 10;

  const colW = (cw - 8) / Math.max(fused.modalities.length, 1);
  fused.modalities.forEach((m, idx) => {
    const mc = hexToRgb(modalityColorMap[m.modality] ?? '#6C63FF') ?? { r: 108, g: 99, b: 255 };
    const label = m.modality.charAt(0).toUpperCase() + m.modality.slice(1);
    const weight = fused.fusionWeights[m.modality] ?? 0;
    const cx = ml + idx * (colW + 4);
    const mCardH = 46;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx, y, colW, mCardH, 3, 3, 'F');
    doc.setFillColor(mc.r, mc.g, mc.b);
    doc.roundedRect(cx, y, colW, 3, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 35, 50);
    doc.text(label, cx + 6, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mc.r, mc.g, mc.b);
    doc.text(m.emotion, cx + 6, y + 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 35, 50);
    doc.text(`${m.confidence}%`, cx + 6, y + 33);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 150, 170);
    doc.text(`Weight: ${weight}%`, cx + 6, y + 40);

    doc.setFillColor(230, 232, 238);
    doc.roundedRect(cx + colW - 22, y + 26, 16, 3, 1, 1, 'F');
    doc.setFillColor(mc.r, mc.g, mc.b);
    doc.roundedRect(cx + colW - 22, y + 26, 16 * (m.confidence / 100), 3, 1, 1, 'F');
  });

  y += 56;

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

    y += 12;
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

  // ── Section 3: Confidence Score Breakdown ────────────────────────────────────
  y += 4;
  pdfSectionLabel(doc, '03  CONFIDENCE SCORE BREAKDOWN', ml, y, ec);
  y += 10;

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

    const barStartX = ml + 60;
    const barTrackW = cw - 75;
    doc.setFillColor(230, 232, 238);
    doc.roundedRect(barStartX, y, barTrackW, 7, 2, 2, 'F');
    doc.setFillColor(mc.r, mc.g, mc.b);
    doc.roundedRect(barStartX, y, barTrackW * (m.confidence / 100), 7, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(mc.r, mc.g, mc.b);
    doc.text(`${m.confidence}%`, pageW - mr, y + 5.5, { align: 'right' });

    y += 12;
  });

  // ── PAGE 2 ──────────────────────────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(248, 249, 252);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(ec.r, ec.g, ec.b);
  doc.rect(0, 0, pageW, 3, 'F');

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

  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(ml, 21, pageW - mr, 21);

  y = 30;

  // ── Section 4: AI Insights ───────────────────────────────────────────────────
  pdfSectionLabel(doc, '04  AI INSIGHTS', ml, y, ec);
  y += 10;

  insights.forEach((insight, i) => {
    const lines = doc.splitTextToSize(insight, cw - 20);
    const blockH = lines.length * 5.5 + 12;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(ml, y, cw, blockH, 3, 3, 'F');
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

  // ── Section 5: Recommendations ───────────────────────────────────────────────
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

    const rc = { r: 236, g: 72, b: 153 };
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(ml, y, cw, blockH, 3, 3, 'F');
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

  // ── Section 6: How the Result Was Computed ───────────────────────────────────
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
  doc.setFillColor(ec.r, ec.g, ec.b);
  doc.roundedRect(ml, y, 3, expH, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 60, 80);
  doc.text(expLines, ml + 8, y + 9);

  y += expH + 10;

  // ── Summary stats row ─────────────────────────────────────────────────────────
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

  // ── Footer on all pages ───────────────────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
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
}

/** Build a FusedResult from a history row (mock data shape) */
export function buildFusedFromHistoryRow(row: {
  id: string;
  date: string;
  time: string;
  inputs: string[];
  emotion: string;
  confidence: number;
  intensity: string;
}): FusedResult {
  const intensityValue = row.intensity === 'High' ? 80 : row.intensity === 'Medium' ? 55 : 30;

  // Build modalities from inputs
  const inputKeys = row.inputs.map((i) => i.toLowerCase());
  const totalInputs = inputKeys.length;

  // Distribute fusion weights evenly
  const baseWeight = Math.floor(100 / totalInputs);
  const remainder = 100 - baseWeight * totalInputs;
  const fusionWeights: Record<string, number> = {};
  inputKeys.forEach((key, idx) => {
    fusionWeights[key] = baseWeight + (idx === 0 ? remainder : 0);
  });

  const modalities = inputKeys.map((key) => ({
    modality: key,
    emotion: row.emotion,
    confidence: Math.max(60, row.confidence - Math.floor(Math.random() * 10)),
    scores: [{ emotion: row.emotion, confidence: row.confidence }],
  }));

  // Parse timestamp from date + time string
  const dateStr = `${row.date} ${row.time}`;
  const parsed = Date.parse(dateStr);
  const timestamp = isNaN(parsed) ? Date.now() : parsed;

  return {
    emotion: row.emotion,
    confidence: row.confidence,
    intensity: intensityValue,
    intensityLabel: row.intensity as 'High' | 'Medium' | 'Low',
    modalities,
    fusionWeights,
    timestamp,
  };
}
