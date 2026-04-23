import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Tab = 'overview' | 'nodejs' | 'python' | 'email-preview' | 'sendgrid' | 'ses' | 'protocol';

// ── Branded Email HTML Template ───────────────────────────────────────────────
export const buildBrandedEmailHtml = (opts: {
  trigger: string;
  severity: string;
  emotion: string;
  confidence: number;
  intensity: number;
  message: string;
  userName: string;
  timestamp?: number;
}) => {
  const { trigger, severity, emotion, confidence, intensity, message, userName, timestamp } = opts;
  const isCritical = severity === 'critical';
  const accentColor = isCritical ? '#EF4444' : '#F59E0B';
  const accentLight = isCritical ? '#FEF2F2' : '#FFFBEB';
  const badgeText = isCritical ? 'CRITICAL ALERT' : 'WARNING';
  const triggerLabel = trigger.replace(/_/g, ' ');
  const dateStr = timestamp
    ? new Date(timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const emotionEmoji: Record<string, string> = {
    Sad: '😢', Anxious: '😰', Angry: '😠', Fearful: '😨',
    Disgusted: '🤢', Distressed: '😣', Happy: '😊', Neutral: '😐',
    Surprised: '😲', Calm: '😌',
  };
  const emoji = emotionEmoji[emotion] || '🔔';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EmpathAI Guardian Alert</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header Bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#0D0D14 0%,#1C1C2E 100%);padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      Empath<span style="color:#00D4AA;">AI</span>
                    </p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6B7280;letter-spacing:0.5px;text-transform:uppercase;">
                      Emotional Intelligence Platform
                    </p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;background:${accentColor};color:#ffffff;font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:100px;text-transform:uppercase;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:${accentLight};border-left:4px solid ${accentColor};padding:16px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;color:${accentColor};text-transform:uppercase;letter-spacing:0.5px;">
                ${triggerLabel}
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">
                Detected on ${dateStr}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
                Hello,<br/>
                EmpathAI has detected an emotional pattern that may require your attention for
                <strong style="color:#111827;">${userName}</strong>.
              </p>

              <!-- Emotion Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                            Detected Emotion
                          </p>
                          <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#111827;">
                            ${emoji} ${emotion}
                          </p>
                        </td>
                        <td align="right" valign="top">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="text-align:center;padding:0 12px;">
                                <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">${confidence}%</p>
                                <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Confidence</p>
                              </td>
                              <td style="width:1px;background:#E5E7EB;"></td>
                              <td style="text-align:center;padding:0 12px;">
                                <p style="margin:0;font-size:22px;font-weight:800;color:${accentColor};">${intensity}%</p>
                                <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Intensity</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Intensity Bar -->
                    <div style="margin-top:16px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size:11px;color:#9CA3AF;">Intensity Level</td>
                          <td align="right" style="font-size:11px;color:#9CA3AF;">${intensity}/100</td>
                        </tr>
                      </table>
                      <div style="margin-top:6px;background:#E5E7EB;border-radius:100px;height:6px;overflow:hidden;">
                        <div style="width:${intensity}%;background:${accentColor};height:6px;border-radius:100px;"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:13px;font-weight:600;color:#1D4ED8;margin-bottom:6px;">
                      What this means
                    </p>
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
                      ${message}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Recommended Actions -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">
                Recommended Actions
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${[
                  'Reach out to the user and check in on how they\'re feeling',
                  'Review their recent emotion history in the EmpathAI dashboard',
                  'Consider scheduling a conversation or wellness check',
                ].map((action, i) => `
                <tr>
                  <td style="padding:6px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:24px;height:24px;background:#00D4AA18;border-radius:50%;text-align:center;vertical-align:middle;font-size:11px;font-weight:700;color:#00D4AA;padding:0 0 0 0;">
                          ${i + 1}
                        </td>
                        <td style="padding-left:10px;font-size:13px;color:#374151;line-height:1.5;">
                          ${action}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="#" style="display:inline-block;background:linear-gradient(135deg,#0D0D14,#1C1C2E);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                      View Full Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 20px;" />

              <!-- Footer Note -->
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;text-align:center;">
                You are receiving this alert because you are listed as a guardian in EmpathAI.<br/>
                To manage your notification preferences, visit the Settings page.
              </p>
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:#9CA3AF;">
                    © ${new Date().getFullYear()} EmpathAI · Emotional Intelligence Platform
                  </td>
                  <td align="right" style="font-size:11px;color:#9CA3AF;">
                    Powered by EmpathAI
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ── Node.js server code with branded template ─────────────────────────────────
const nodeServerCode = `// EmpathAI Backend Server — Node.js + Express + WebSocket
// Install: npm install express ws cors @sendgrid/mail dotenv
// Run: node server.js

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/emotions' });

// ── Multi-user session store ──────────────────────────────────────────────────
const sessions = new Map();

wss.on('connection', (ws) => {
  let sessionId = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'session_start') {
        sessionId = msg.sessionId;
        sessions.set(sessionId, { ws, history: [], connectedAt: Date.now() });
        ws.send(JSON.stringify({ type: 'session_ack', sessionId, timestamp: Date.now() }));
        console.log('[WS] Session started:', sessionId);
      }

      if (msg.type === 'emotion_update' && sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
          session.history.push(msg.payload);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'emotion_update',
                payload: msg.payload,
                sessionId,
                timestamp: Date.now(),
              }));
            }
          });
        }
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (e) {
      console.error('[WS] Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    if (sessionId) {
      sessions.delete(sessionId);
      console.log('[WS] Session ended:', sessionId);
    }
  });
});

// ── Email Alert Endpoint ──────────────────────────────────────────────────────
app.post('/api/send-alert', async (req, res) => {
  const { to, subject, trigger, severity, emotion, confidence,
          intensity, message, userName, alertId, timestamp } = req.body;

  if (req.body.type === 'ping') {
    return res.json({ success: true, pong: true });
  }

  if (!to || !subject) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const htmlBody = buildEmailHtml({
      trigger, severity, emotion, confidence,
      intensity, message, userName, timestamp
    });

    const msg = {
      to: Array.isArray(to) ? to : [to],
      from: {
        email: process.env.FROM_EMAIL || 'alerts@empathai.app',
        name: 'EmpathAI Guardian System',
      },
      subject,
      html: htmlBody,
      text: message,
    };

    const [response] = await sgMail.send(msg);
    console.log('[Email] Sent alert', alertId, '→', to, '| Status:', response.statusCode);
    res.json({ success: true, messageId: response.headers['x-message-id'] });
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Session Stats ─────────────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  const stats = Array.from(sessions.entries()).map(([id, s]) => ({
    sessionId: id,
    connectedAt: s.connectedAt,
    emotionCount: s.history.length,
    lastEmotion: s.history[s.history.length - 1]?.emotion || null,
  }));
  res.json({ activeSessions: sessions.size, sessions: stats });
});

app.get('/health', (_, res) => res.json({ status: 'ok', sessions: sessions.size }));

// ── Branded Email HTML Builder ────────────────────────────────────────────────
function buildEmailHtml({ trigger, severity, emotion, confidence, intensity, message, userName, timestamp }) {
  const isCritical = severity === 'critical';
  const accentColor = isCritical ? '#EF4444' : '#F59E0B';
  const accentLight = isCritical ? '#FEF2F2' : '#FFFBEB';
  const badgeText = isCritical ? 'CRITICAL ALERT' : 'WARNING';
  const triggerLabel = trigger.replace(/_/g, ' ');
  const dateStr = timestamp
    ? new Date(timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const emotionEmoji = {
    Sad: '😢', Anxious: '😰', Angry: '😠', Fearful: '😨',
    Disgusted: '🤢', Distressed: '😣', Happy: '😊', Neutral: '😐',
  };
  const emoji = emotionEmoji[emotion] || '🔔';

  return \`<!DOCTYPE html>
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
                <span style="display:inline-block;background:\${accentColor};color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:100px;text-transform:uppercase;">\${badgeText}</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Alert Banner -->
        <tr>
          <td style="background:\${accentLight};border-left:4px solid \${accentColor};padding:16px 32px;">
            <p style="margin:0;font-size:13px;font-weight:600;color:\${accentColor};text-transform:uppercase;letter-spacing:0.5px;">\${triggerLabel}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">Detected on \${dateStr}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              Hello,<br/>EmpathAI has detected an emotional pattern that may require your attention for <strong style="color:#111827;">\${userName}</strong>.
            </p>

            <!-- Emotion Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Detected Emotion</p>
                    <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#111827;">\${emoji} \${emotion}</p>
                  </td>
                  <td align="right" valign="top">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="text-align:center;padding:0 12px;">
                        <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">\${confidence}%</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Confidence</p>
                      </td>
                      <td style="width:1px;background:#E5E7EB;"></td>
                      <td style="text-align:center;padding:0 12px;">
                        <p style="margin:0;font-size:22px;font-weight:800;color:\${accentColor};">\${intensity}%</p>
                        <p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Intensity</p>
                      </td>
                    </tr></table>
                  </td>
                </tr></table>
                <div style="margin-top:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:11px;color:#9CA3AF;">Intensity Level</td>
                    <td align="right" style="font-size:11px;color:#9CA3AF;">\${intensity}/100</td>
                  </tr></table>
                  <div style="margin-top:6px;background:#E5E7EB;border-radius:100px;height:6px;overflow:hidden;">
                    <div style="width:\${intensity}%;background:\${accentColor};height:6px;border-radius:100px;"></div>
                  </div>
                </div>
              </td></tr>
            </table>

            <!-- Message -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#1D4ED8;margin-bottom:6px;">What this means</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">\${message}</p>
              </td></tr>
            </table>

            <!-- Actions -->
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">Recommended Actions</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              \${['Reach out to the user and check in on how they\\'re feeling',
                 'Review their recent emotion history in the EmpathAI dashboard',
                 'Consider scheduling a conversation or wellness check'].map((action, i) => \`
              <tr><td style="padding:6px 0;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:24px;height:24px;background:#00D4AA18;border-radius:50%;text-align:center;vertical-align:middle;font-size:11px;font-weight:700;color:#00D4AA;">\${i + 1}</td>
                  <td style="padding-left:10px;font-size:13px;color:#374151;line-height:1.5;">\${action}</td>
                </tr></table>
              </td></tr>\`).join('')}
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="\${process.env.APP_URL || 'https://empathai.app'}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0D0D14,#1C1C2E);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">
                  View Full Dashboard →
                </a>
              </td></tr>
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
              <td style="font-size:11px;color:#9CA3AF;">© \${new Date().getFullYear()} EmpathAI · Emotional Intelligence Platform</td>
              <td align="right" style="font-size:11px;color:#9CA3AF;">Powered by EmpathAI</td>
            </tr></table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>\`;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(\`[EmpathAI] Server running on port \${PORT}\`));
`;

const pythonServerCode = `# EmpathAI Backend Server — Python + FastAPI + WebSocket
# Install: pip install fastapi uvicorn websockets sendgrid python-dotenv
# Run: uvicorn server:app --host 0.0.0.0 --port 3001

import asyncio, json, os, uuid
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="EmpathAI Backend")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

sessions: dict[str, dict] = {}
connected_clients: list[WebSocket] = []

@app.websocket("/ws/emotions")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    connected_clients.append(ws)
    session_id = None
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            if msg.get("type") == "session_start":
                session_id = msg.get("sessionId", str(uuid.uuid4()))
                sessions[session_id] = {"ws": ws, "history": [], "connected_at": datetime.utcnow().isoformat()}
                await ws.send_text(json.dumps({"type": "session_ack", "sessionId": session_id, "timestamp": int(datetime.utcnow().timestamp() * 1000)}))
            elif msg.get("type") == "emotion_update" and session_id:
                payload = msg.get("payload", {})
                if session_id in sessions:
                    sessions[session_id]["history"].append(payload)
                broadcast = json.dumps({"type": "emotion_update", "payload": payload, "sessionId": session_id, "timestamp": int(datetime.utcnow().timestamp() * 1000)})
                for client in connected_clients:
                    try: await client.send_text(broadcast)
                    except: pass
            elif msg.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong", "timestamp": int(datetime.utcnow().timestamp() * 1000)}))
    except WebSocketDisconnect:
        connected_clients.remove(ws)
        if session_id and session_id in sessions:
            del sessions[session_id]

class AlertPayload(BaseModel):
    to: List[str]
    subject: str
    trigger: str
    severity: str
    emotion: str
    confidence: float
    intensity: float
    intensityLabel: str
    message: str
    userName: str
    alertId: str
    sessionId: str
    timestamp: int
    type: Optional[str] = None

EMOTION_EMOJI = {"Sad":"😢","Anxious":"😰","Angry":"😠","Fearful":"😨","Disgusted":"🤢","Distressed":"😣","Happy":"😊","Neutral":"😐"}

def build_email_html(p: AlertPayload) -> str:
    is_critical = p.severity == "critical"
    accent = "#EF4444" if is_critical else "#F59E0B"
    accent_light = "#FEF2F2" if is_critical else "#FFFBEB"
    badge = "CRITICAL ALERT" if is_critical else "WARNING"
    trigger_label = p.trigger.replace("_", " ")
    emoji = EMOTION_EMOJI.get(p.emotion, "🔔")
    date_str = datetime.fromtimestamp(p.timestamp / 1000).strftime("%b %d, %Y %I:%M %p")
    year = datetime.utcnow().year
    actions = [
        "Reach out to the user and check in on how they're feeling",
        "Review their recent emotion history in the EmpathAI dashboard",
        "Consider scheduling a conversation or wellness check",
    ]
    actions_html = "".join([
        f'<tr><td style="padding:6px 0;"><table cellpadding="0" cellspacing="0"><tr>'
        f'<td style="width:24px;height:24px;background:#00D4AA18;border-radius:50%;text-align:center;vertical-align:middle;font-size:11px;font-weight:700;color:#00D4AA;">{i+1}</td>'
        f'<td style="padding-left:10px;font-size:13px;color:#374151;line-height:1.5;">{a}</td>'
        f'</tr></table></td></tr>'
        for i, a in enumerate(actions)
    ])
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>EmpathAI Guardian Alert</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#0D0D14 0%,#1C1C2E 100%);padding:28px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><p style="margin:0;font-size:22px;font-weight:800;color:#fff;">Empath<span style="color:#00D4AA;">AI</span></p>
    <p style="margin:4px 0 0;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Emotional Intelligence Platform</p></td>
    <td align="right"><span style="display:inline-block;background:{accent};color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 12px;border-radius:100px;text-transform:uppercase;">{badge}</span></td>
  </tr></table>
</td></tr>
<tr><td style="background:{accent_light};border-left:4px solid {accent};padding:16px 32px;">
  <p style="margin:0;font-size:13px;font-weight:600;color:{accent};text-transform:uppercase;letter-spacing:0.5px;">{trigger_label}</p>
  <p style="margin:4px 0 0;font-size:12px;color:#6B7280;">Detected on {date_str}</p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Hello,<br/>EmpathAI has detected an emotional pattern that may require your attention for <strong style="color:#111827;">{p.userName}</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Detected Emotion</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#111827;">{emoji} {p.emotion}</p></td>
        <td align="right" valign="top"><table cellpadding="0" cellspacing="0"><tr>
          <td style="text-align:center;padding:0 12px;"><p style="margin:0;font-size:22px;font-weight:800;color:#111827;">{p.confidence:.0f}%</p><p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Confidence</p></td>
          <td style="width:1px;background:#E5E7EB;"></td>
          <td style="text-align:center;padding:0 12px;"><p style="margin:0;font-size:22px;font-weight:800;color:{accent};">{p.intensity:.0f}%</p><p style="margin:2px 0 0;font-size:11px;color:#9CA3AF;">Intensity</p></td>
        </tr></table></td>
      </tr></table>
      <div style="margin-top:16px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#9CA3AF;">Intensity Level</td>
          <td align="right" style="font-size:11px;color:#9CA3AF;">{p.intensity:.0f}/100</td>
        </tr></table>
        <div style="margin-top:6px;background:#E5E7EB;border-radius:100px;height:6px;overflow:hidden;">
          <div style="width:{p.intensity:.0f}%;background:{accent};height:6px;border-radius:100px;"></div>
        </div>
      </div>
    </td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EFF6FF;border-radius:10px;margin-bottom:24px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#1D4ED8;margin-bottom:6px;">What this means</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">{p.message}</p>
    </td></tr>
  </table>
  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px;">Recommended Actions</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">{actions_html}</table>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr><td align="center">
      <a href="{os.environ.get('APP_URL','https://empathai.app')}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0D0D14,#1C1C2E);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">View Full Dashboard →</a>
    </td></tr>
  </table>
  <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 20px;"/>
  <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;text-align:center;">You are receiving this alert because you are listed as a guardian in EmpathAI.<br/>To manage your notification preferences, visit the Settings page.</p>
</td></tr>
<tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:11px;color:#9CA3AF;">© {year} EmpathAI · Emotional Intelligence Platform</td>
    <td align="right" style="font-size:11px;color:#9CA3AF;">Powered by EmpathAI</td>
  </tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""

@app.post("/api/send-alert")
async def send_alert(payload: AlertPayload):
    if payload.type == "ping":
        return {"success": True, "pong": True}
    sg = SendGridAPIClient(os.environ.get("SENDGRID_API_KEY"))
    message = Mail(
        from_email=(os.environ.get("FROM_EMAIL", "alerts@empathai.app"), "EmpathAI Guardian System"),
        to_emails=payload.to,
        subject=payload.subject,
        html_content=build_email_html(payload)
    )
    try:
        response = sg.send(message)
        return {"success": True, "messageId": response.headers.get("X-Message-Id")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions")
async def get_sessions():
    stats = [{"sessionId": sid, "connectedAt": s["connected_at"], "emotionCount": len(s["history"]), "lastEmotion": s["history"][-1].get("emotion") if s["history"] else None} for sid, s in sessions.items()]
    return {"activeSessions": len(sessions), "sessions": stats}

@app.get("/health")
async def health():
    return {"status": "ok", "sessions": len(sessions)}
`;

const deployGuide = `# Deploy Your EmpathAI Backend (Free Options)

## Option 1: Railway (Recommended — Easiest)
   1. Push your server code to a GitHub repo
   2. Go to https://railway.app → New Project → Deploy from GitHub
   3. Add environment variables:
      SENDGRID_API_KEY=SG.xxxx
      FROM_EMAIL=alerts@yourdomain.com
      APP_URL=https://your-empathai-app.com
   4. Railway auto-detects Node.js/Python and deploys
   5. Copy the generated URL (e.g. https://empathai-backend.up.railway.app)
   6. In EmpathAI Settings:
      WebSocket: wss://empathai-backend.up.railway.app/ws/emotions
      Email API: https://empathai-backend.up.railway.app/api/send-alert

## Option 2: Render (Also Free)
   1. Go to https://render.com → New Web Service
   2. Connect your GitHub repo
   3. Build command: npm install (or pip install -r requirements.txt)
   4. Start command: node server.js (or uvicorn server:app --host 0.0.0.0 --port $PORT)
   5. Add environment variables in Render dashboard
   6. Deploy → copy URL → update Settings

## Option 3: Fly.io (Best Performance)
   1. Install flyctl: curl -L https://fly.io/install.sh | sh
   2. fly auth login
   3. fly launch (in your server directory)
   4. fly secrets set SENDGRID_API_KEY=SG.xxxx FROM_EMAIL=alerts@yourdomain.com
   5. fly deploy
   6. Copy the .fly.dev URL → update Settings

## Local Development (Instant)
   Node.js:
     npm install express ws cors @sendgrid/mail dotenv
     node server.js
     → ws://localhost:3001/ws/emotions
     → http://localhost:3001/api/send-alert

   Python:
     pip install fastapi uvicorn websockets sendgrid python-dotenv
     uvicorn server:app --host 0.0.0.0 --port 3001
     → ws://localhost:3001/ws/emotions
     → http://localhost:3001/api/send-alert

## .env File Template
   SENDGRID_API_KEY=SG.your_key_here
   FROM_EMAIL=alerts@yourdomain.com
   APP_URL=https://your-app-url.com
   PORT=3001
`;

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'ri-layout-grid-line' },
  { id: 'nodejs', label: 'Node.js', icon: 'ri-nodejs-line' },
  { id: 'python', label: 'Python', icon: 'ri-code-s-slash-line' },
  { id: 'email-preview', label: 'Email Preview', icon: 'ri-mail-open-line' },
  { id: 'sendgrid', label: 'SendGrid', icon: 'ri-mail-send-line' },
  { id: 'ses', label: 'AWS SES', icon: 'ri-cloud-line' },
  { id: 'protocol', label: 'Deploy Guide', icon: 'ri-rocket-line' },
];

function CodeBlock({ code, language = 'javascript' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ background: '#0A0A12', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#13131A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-xs text-gray-500 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          style={{ color: copied ? '#00D4AA' : '#6B7280' }}
        >
          <div className="w-3 h-3 flex items-center justify-center">
            <i className={`${copied ? 'ri-check-line' : 'ri-clipboard-line'} text-xs`}></i>
          </div>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs text-gray-300 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap" style={{ maxHeight: '520px' }}>
        {code}
      </pre>
    </div>
  );
}

// ── Email Preview Component ───────────────────────────────────────────────────
type PreviewScenario = 'critical' | 'warning' | 'prolonged';

const previewScenarios: { id: PreviewScenario; label: string; icon: string; color: string }[] = [
  { id: 'critical', label: 'High Intensity (Critical)', icon: 'ri-alarm-warning-line', color: '#EF4444' },
  { id: 'warning', label: 'Repeated Negative (Warning)', icon: 'ri-error-warning-line', color: '#F59E0B' },
  { id: 'prolonged', label: 'Prolonged Distress (Critical)', icon: 'ri-time-line', color: '#EF4444' },
];

const scenarioData: Record<PreviewScenario, Parameters<typeof buildBrandedEmailHtml>[0]> = {
  critical: {
    trigger: 'HIGH_INTENSITY',
    severity: 'critical',
    emotion: 'Sad',
    confidence: 87,
    intensity: 85,
    message: 'High-intensity sadness detected (85% intensity). Immediate attention may be needed.',
    userName: 'Alex Morgan',
    timestamp: Date.now(),
  },
  warning: {
    trigger: 'REPEATED_NEGATIVE',
    severity: 'warning',
    emotion: 'Anxious',
    confidence: 79,
    intensity: 62,
    message: '3 consecutive anxious detections observed. User may need support.',
    userName: 'Alex Morgan',
    timestamp: Date.now(),
  },
  prolonged: {
    trigger: 'PROLONGED_DISTRESS',
    severity: 'critical',
    emotion: 'Distressed',
    confidence: 83,
    intensity: 74,
    message: 'Prolonged distress pattern detected: 5+ negative emotions within 30 minutes.',
    userName: 'Alex Morgan',
    timestamp: Date.now(),
  },
};

function EmailPreviewTab() {
  const [activeScenario, setActiveScenario] = useState<PreviewScenario>('critical');
  const html = buildBrandedEmailHtml(scenarioData[activeScenario]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)' }}>
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i className="ri-eye-line text-xs" style={{ color: '#00D4AA' }}></i>
        </div>
        <p className="text-xs" style={{ color: '#00D4AA' }}>
          Live preview of the branded email your guardians will receive. This exact HTML is sent by the backend server.
        </p>
      </div>

      {/* Scenario Selector */}
      <div className="flex gap-2 flex-wrap">
        {previewScenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScenario(s.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
            style={{
              background: activeScenario === s.id ? `${s.color}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeScenario === s.id ? `${s.color}50` : 'rgba(255,255,255,0.06)'}`,
              color: activeScenario === s.id ? s.color : '#6B7280',
            }}
          >
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <i className={`${s.icon} text-xs`}></i>
            </div>
            {s.label}
          </button>
        ))}
      </div>

      {/* Email Preview Frame */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Fake email client chrome */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#13131A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-gray-500">Email Preview — Guardian Inbox</span>
          </div>
        </div>
        <div className="bg-white" style={{ minHeight: '400px' }}>
          <iframe
            srcDoc={html}
            title="Email Preview"
            className="w-full"
            style={{ height: '680px', border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BackendSetupPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
          >
            <i className="ri-arrow-left-line text-gray-400 text-sm"></i>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Backend Setup Guide
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Deploy your server, preview branded emails, and connect everything in Settings
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="mt-6 mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)' }}>
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i className="ri-information-line text-sm" style={{ color: '#6C63FF' }}></i>
          </div>
          <div>
            <p className="text-white text-sm font-medium">Currently running in simulated mode</p>
            <p className="text-gray-400 text-xs mt-1">
              EmpathAI works fully in-browser without a backend. Deploy a server below to enable real WebSocket streaming, persistent multi-user history, and actual email delivery via SendGrid or AWS SES.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeTab === tab.id ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: activeTab === tab.id ? '#6C63FF' : '#6B7280',
              }}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                <i className={`${tab.icon} text-xs`}></i>
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: 'ri-wifi-line', color: '#00D4AA', title: 'WebSocket Server', desc: 'Real-time emotion streaming with multi-user broadcast support and auto-reconnect' },
                { icon: 'ri-mail-send-line', color: '#6C63FF', title: 'Branded Email Alerts', desc: 'Beautiful guardian notifications with your EmpathAI branding via SendGrid or AWS SES' },
                { icon: 'ri-group-line', color: '#F59E0B', title: 'Multi-User', desc: 'Session management, emotion history persistence, and live dashboard for all users' },
              ].map((card) => (
                <div key={card.title} className="p-5 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${card.color}18` }}>
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className={`${card.icon} text-base`} style={{ color: card.color }}></i>
                    </div>
                  </div>
                  <p className="text-white text-sm font-semibold mb-1.5">{card.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white text-sm font-semibold mb-4">Quick Start (5 minutes)</p>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Copy the Node.js or Python server code from the tabs above', color: '#6C63FF' },
                  { step: '2', text: 'Create a .env file with your SendGrid API key and FROM_EMAIL', color: '#00D4AA' },
                  { step: '3', text: 'Run locally: node server.js or uvicorn server:app — or deploy to Railway/Render', color: '#F59E0B' },
                  { step: '4', text: 'Go to Settings → WebSocket Server → enter ws://localhost:3001/ws/emotions', color: '#6C63FF' },
                  { step: '5', text: 'Go to Settings → Email API → enter http://localhost:3001/api/send-alert', color: '#00D4AA' },
                  { step: '6', text: 'Test both connections and save — you\'re live with real email alerts!', color: '#F59E0B' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: `${item.color}20`, color: item.color }}>
                      {item.step}
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setActiveTab('email-preview')}
              className="w-full p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all hover:opacity-90"
              style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,170,0.15)' }}>
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-mail-open-line text-sm" style={{ color: '#00D4AA' }}></i>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: '#00D4AA' }}>Preview Branded Email Templates</p>
                <p className="text-xs text-gray-500 mt-0.5">See exactly what your guardians will receive — 3 alert scenarios</p>
              </div>
              <div className="ml-auto w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-right-line text-sm" style={{ color: '#00D4AA' }}></i>
              </div>
            </button>
          </div>
        )}

        {activeTab === 'nodejs' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)' }}>
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className="ri-terminal-line text-xs" style={{ color: '#00D4AA' }}></i>
              </div>
              <code className="text-xs" style={{ color: '#00D4AA' }}>
                npm install express ws cors @sendgrid/mail dotenv &amp;&amp; node server.js
              </code>
            </div>
            <CodeBlock code={nodeServerCode} language="javascript (server.js)" />
          </div>
        )}

        {activeTab === 'python' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)' }}>
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className="ri-terminal-line text-xs" style={{ color: '#00D4AA' }}></i>
              </div>
              <code className="text-xs" style={{ color: '#00D4AA' }}>
                pip install fastapi uvicorn websockets sendgrid python-dotenv &amp;&amp; uvicorn server:app --host 0.0.0.0 --port 3001
              </code>
            </div>
            <CodeBlock code={pythonServerCode} language="python (server.py)" />
          </div>
        )}

        {activeTab === 'email-preview' && <EmailPreviewTab />}

        {activeTab === 'sendgrid' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.15)' }}>
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className="ri-gift-line text-xs" style={{ color: '#6C63FF' }}></i>
              </div>
              <p className="text-xs" style={{ color: '#6C63FF' }}>Free tier: 100 emails/day forever — no credit card required</p>
            </div>
            <CodeBlock code={`# SendGrid Setup Guide

## 1. Create a SendGrid Account
   → https://signup.sendgrid.com (free tier: 100 emails/day)

## 2. Get your API Key
   Dashboard → Settings → API Keys → Create API Key
   Permission: "Mail Send" (restricted key is fine)
   Copy the key — you only see it once!

## 3. Verify your sender email
   Dashboard → Settings → Sender Authentication
   Either verify a single sender email OR authenticate your domain

## 4. Add to your .env file
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
   FROM_EMAIL=alerts@yourdomain.com

## 5. Configure in EmpathAI Settings
   Email API URL: http://localhost:3001/api/send-alert
   (or your deployed server URL)

## 6. Test it
   Go to Settings → Email API → Test Connection
   Then trigger an alert from the Dashboard

## Free Tier Limits
   - 100 emails/day forever (free)
   - 40,000 emails/month for first 30 days
   - No credit card required`} language="setup guide" />
          </div>
        )}

        {activeTab === 'ses' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className="ri-information-line text-xs" style={{ color: '#F59E0B' }}></i>
              </div>
              <p className="text-xs" style={{ color: '#F59E0B' }}>AWS SES: $0.10 per 1,000 emails — extremely cost-effective for production</p>
            </div>
            <CodeBlock code={`# AWS SES Setup Guide

## 1. Enable SES in AWS Console
   → https://console.aws.amazon.com/ses
   Choose your region (us-east-1 recommended)

## 2. Verify your email/domain
   SES → Verified Identities → Create Identity
   Verify either a single email or your full domain (recommended)

## 3. Create IAM credentials
   IAM → Users → Create User → Attach policy: AmazonSESFullAccess
   Create Access Key → Download CSV

## 4. Install AWS SDK in your backend
   npm install @aws-sdk/client-ses
   # or for Python:
   pip install boto3

## 5. Node.js SES code (replace SendGrid in server.js)
   import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
   const ses = new SESClient({
     region: process.env.AWS_REGION || "us-east-1",
     credentials: {
       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
     }
   });
   const command = new SendEmailCommand({
     Source: process.env.FROM_EMAIL,
     Destination: { ToAddresses: to },
     Message: {
       Subject: { Data: subject },
       Body: { Html: { Data: htmlBody } }
     }
   });
   await ses.send(command);

## 6. Add to .env
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   FROM_EMAIL=alerts@yourdomain.com

## Sandbox vs Production
   New accounts start in Sandbox (can only send to verified emails)
   Request production access: SES → Account Dashboard → Request Production Access`} language="setup guide" />
          </div>
        )}

        {activeTab === 'protocol' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <i className="ri-rocket-line text-xs text-gray-400"></i>
              </div>
              <p className="text-xs text-gray-400">Step-by-step deployment guide for Railway, Render, Fly.io, and local development</p>
            </div>
            <CodeBlock code={deployGuide} language="deployment guide" />
          </div>
        )}
      </div>
    </div>
  );
}
