/**
 * Branded EmpathAI email template builder.
 * Used by both the email preview page and the backend email service.
 */

export interface EmailTemplateParams {
  trigger: string;
  severity: string;
  emotion: string;
  confidence: number;
  intensity: number;
  message: string;
  userName: string;
  timestamp: number;
}

const EMOTION_EMOJI: Record<string, string> = {
  Sad: '😢',
  Anxious: '😰',
  Angry: '😠',
  Fearful: '😨',
  Disgusted: '🤢',
  Distressed: '😣',
  Happy: '😊',
  Neutral: '😐',
  Surprised: '😲',
};

export function buildBrandedEmailHtml(p: EmailTemplateParams): string {
  const isCritical = p.severity === 'critical';
  const accentColor = isCritical ? '#EF4444' : '#F59E0B';
  const accentLight = isCritical ? '#FEF2F2' : '#FFFBEB';
  const badgeText = isCritical ? 'CRITICAL ALERT' : 'WARNING';
  const triggerLabel = p.trigger.replace(/_/g, ' ');
  const dateStr = `${new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(p.timestamp))} IST`;
  const emoji = EMOTION_EMOJI[p.emotion] || '🔔';
  const year = new Date().getFullYear();

  const actions = [
    "Reach out to the user and check in on how they're feeling",
    'Review their recent emotion history in the EmpathAI dashboard',
    'Consider scheduling a conversation or wellness check',
  ];

  const actionsHtml = actions
    .map(
      (action, i) => `
      <tr><td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:24px;height:24px;background:#00D4AA18;border-radius:50%;text-align:center;vertical-align:middle;font-size:11px;font-weight:700;color:#00D4AA;">${i + 1}</td>
          <td style="padding-left:10px;font-size:13px;color:#374151;line-height:1.5;">${action}</td>
        </tr></table>
      </td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EmpathAI Guardian Alert</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0D0D14 0%,#1C1C2E 100%);padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">Empath<span style="color:#00D4AA;">AI</span></p>
                <p style="margin:4px 0 0;font-size:12px;color:#6B7280;letter-spacing:0.5px;text-transform:uppercase;">Emotional Intelligence Platform</p>
              </td>
              <td align="right">
                <span style="display:inline-block;background:${accentColor};color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:100px;text-transform:uppercase;">${badgeText}</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Alert Banner -->
        <tr>
          <td style="background:${accentLight};border-left:4px solid ${accentColor};padding:16px 32px;">
            <p style="margin:0;font-size:13px;font-weight:600;color:${accentColor};text-transform:uppercase;letter-spacing:0.5px;">${triggerLabel}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">Detected on ${dateStr}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Hello,<br/>EmpathAI has detected an emotional pattern that may require your attention for <strong style="color:#111827;">${p.userName}</strong>.
            </p>

            <!-- Emotion Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Detected Emotion</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#111827;">${emoji} ${p.emotion}</p>
                  </td>
                  <td align="right" valign="top">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="text-align:center;padding:0 12px;">
                        <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">${p.confidence}%</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Confidence</p>
                      </td>
                      <td style="width:1px;background:#E5E7EB;"></td>
                      <td style="text-align:center;padding:0 12px;">
                        <p style="margin:0;font-size:22px;font-weight:800;color:${accentColor};">${p.intensity}%</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Intensity</p>
                      </td>
                    </tr></table>
                  </td>
                </tr></table>
                <div style="margin-top:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:11px;color:#9CA3AF;">Intensity Level</td>
                    <td align="right" style="font-size:11px;color:#9CA3AF;">${p.intensity}/100</td>
                  </tr></table>
                  <div style="margin-top:6px;background:#E5E7EB;border-radius:100px;height:6px;overflow:hidden;">
                    <div style="width:${p.intensity}%;background:${accentColor};height:6px;border-radius:100px;"></div>
                  </div>
                </div>
              </td></tr>
            </table>

            <!-- Message -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#1D4ED8;margin-bottom:6px;">What this means</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${p.message}</p>
              </td></tr>
            </table>

            <!-- Actions -->
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">Recommended Actions</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              ${actionsHtml}
            </table>

            <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 20px;" />
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;text-align:center;">
              You are receiving this alert because you are listed as a guardian in EmpathAI.<br/>
              To manage your notification preferences, visit the Settings page.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:11px;color:#9CA3AF;">© ${year} EmpathAI · Emotional Intelligence Platform</td>
              <td align="right" style="font-size:11px;color:#9CA3AF;">Powered by EmpathAI</td>
            </tr></table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
