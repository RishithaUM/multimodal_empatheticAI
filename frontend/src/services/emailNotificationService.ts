// ... existing code ...

import type { GuardianAlert } from './guardianAlertService';

export type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
};

export type EmailConnectionTestResult = {
  ok: boolean;
  latencyMs?: number;
  status?: number;
  error?: string;
};

const BACKEND_EMAIL_URL = 'http://localhost:5000/api/alerts/send-email';
const EMAIL_API_URL_KEY = 'empathai_email_api_url';
const EMAIL_API_KEY_KEY = 'empathai_email_api_key';

class EmailNotificationService {
  /** Always configured — emails route through the backend (SendGrid) */
  isConfigured(): boolean {
    return true;
  }

  getApiUrl(): string {
    return localStorage.getItem(EMAIL_API_URL_KEY) || BACKEND_EMAIL_URL;
  }

  setApiUrl(url: string): void {
    const value = url.trim();
    if (value) {
      localStorage.setItem(EMAIL_API_URL_KEY, value);
    } else {
      localStorage.removeItem(EMAIL_API_URL_KEY);
    }
  }

  getApiKey(): string {
    return localStorage.getItem(EMAIL_API_KEY_KEY) || '';
  }

  setApiKey(key: string): void {
    const value = key.trim();
    if (value) {
      localStorage.setItem(EMAIL_API_KEY_KEY, value);
    } else {
      localStorage.removeItem(EMAIL_API_KEY_KEY);
    }
  }

  async testConnection(): Promise<EmailConnectionTestResult> {
    const url = this.getApiUrl();
    if (!url) {
      return { ok: false, error: 'Missing API URL' };
    }

    const apiKey = this.getApiKey();
    const start = performance.now();

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({ type: 'ping' }),
      });

      const latencyMs = Math.round(performance.now() - start);
      // Consider auth/validation failures as reachable endpoint.
      const ok = res.ok || [400, 401, 403, 404, 405].includes(res.status);
      return { ok, latencyMs, status: res.status, error: ok ? undefined : `HTTP ${res.status}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { ok: false, error: message };
    }
  }

  async sendGuardianAlert(alert: GuardianAlert, userName?: string): Promise<EmailSendResult> {
    const token = localStorage.getItem('token');
    const resolvedName = userName || localStorage.getItem('empathai_user_name') || 'EmpathAI User';
    const apiUrl = this.getApiUrl();
    const apiKey = this.getApiKey();

    if (!token) {
      // Not logged in — simulate
      await this.simulateDelay();
      return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
    }

    try {
      const response = await fetch(apiUrl || BACKEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          to: alert.guardianEmails,
          emotion: alert.emotion,
          severity: alert.severity,
          trigger: alert.trigger,
          confidence: alert.confidence,
          intensity: alert.intensity,
          intensityLabel: alert.intensityLabel,
          message: alert.message,
          timestamp: alert.timestamp,
          userName: resolvedName,
        }),
      });

      const data = await response.json().catch(() => ({ success: false })) as { success?: boolean; messageId?: string; error?: string };

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || `HTTP ${response.status}` };
      }

      return { success: true, messageId: data.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  }

  private simulateDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2000));
  }
}

export const emailNotificationService = new EmailNotificationService();
