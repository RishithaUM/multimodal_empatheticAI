// ... existing code ...

import type { GuardianAlert } from './guardianAlertService';

export type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
};

const EMAIL_API_URL_KEY = 'empathai_email_api_url';
const EMAIL_API_KEY_KEY = 'empathai_email_api_key';
const USER_NAME_KEY = 'empathai_user_name';

class EmailNotificationService {
  getApiUrl(): string {
    return localStorage.getItem(EMAIL_API_URL_KEY) || '';
  }

  setApiUrl(url: string): void {
    if (url.trim()) {
      localStorage.setItem(EMAIL_API_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(EMAIL_API_URL_KEY);
    }
  }

  getApiKey(): string {
    return localStorage.getItem(EMAIL_API_KEY_KEY) || '';
  }

  setApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(EMAIL_API_KEY_KEY, key.trim());
    } else {
      localStorage.removeItem(EMAIL_API_KEY_KEY);
    }
  }

  getUserName(): string {
    return localStorage.getItem(USER_NAME_KEY) || 'EmpathAI User';
  }

  setUserName(name: string): void {
    if (name.trim()) {
      localStorage.setItem(USER_NAME_KEY, name.trim());
    } else {
      localStorage.removeItem(USER_NAME_KEY);
    }
  }

  isConfigured(): boolean {
    return !!this.getApiUrl();
  }

  async sendGuardianAlert(alert: GuardianAlert, userName?: string): Promise<EmailSendResult> {
    const apiUrl = this.getApiUrl();
    const apiKey = this.getApiKey();
    const resolvedName = userName || this.getUserName();

    if (!apiUrl) {
      console.info('[EmailService] No API URL configured. Simulating email send for alert:', alert.id);
      await this.simulateDelay();
      return { success: true, simulated: true, messageId: `sim_${Date.now()}` };
    }

    const subject = this.buildSubject(alert, resolvedName);
    const payload = {
      to: alert.guardianEmails,
      subject,
      alertId: alert.id,
      trigger: alert.trigger,
      severity: alert.severity,
      emotion: alert.emotion,
      confidence: alert.confidence,
      intensity: alert.intensity,
      intensityLabel: alert.intensityLabel,
      message: alert.message,
      sessionId: alert.sessionId,
      timestamp: alert.timestamp,
      userName: resolvedName,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const data = await response.json().catch(() => ({ success: true }));
      return {
        success: data.success !== false,
        messageId: data.messageId,
        error: data.error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return { success: false, error: message };
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) return { ok: false, error: 'No API URL configured' };

    const start = Date.now();
    try {
      const apiKey = this.getApiKey();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'ping', timestamp: Date.now() }),
        signal: AbortSignal.timeout(6000),
      });

      const latencyMs = Date.now() - start;
      if (response.ok || response.status === 400) {
        return { ok: true, latencyMs };
      }
      return { ok: false, error: `HTTP ${response.status}`, latencyMs };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      return { ok: false, error: message };
    }
  }

  private buildSubject(alert: GuardianAlert, userName: string): string {
    const prefix = alert.severity === 'critical' ? '[URGENT]' : '[Alert]';
    switch (alert.trigger) {
      case 'HIGH_INTENSITY':
        return `${prefix} EmpathAI: High-intensity ${alert.emotion} detected for ${userName}`;
      case 'REPEATED_NEGATIVE':
        return `${prefix} EmpathAI: Repeated negative emotions detected for ${userName}`;
      case 'PROLONGED_DISTRESS':
        return `${prefix} EmpathAI: Prolonged distress pattern for ${userName}`;
      default:
        return `${prefix} EmpathAI: Guardian Alert for ${userName}`;
    }
  }

  private simulateDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 2000));
  }
}

export const emailNotificationService = new EmailNotificationService();
