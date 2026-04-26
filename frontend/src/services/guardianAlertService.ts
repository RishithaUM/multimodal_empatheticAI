/**
 * Guardian Alert Service
 * Monitors emotion history for distress patterns and triggers alerts.
 *
 * Trigger condition:
 * REPEATED_NEGATIVE — same emotion detected 3 consecutive times (any of the 7 emotions)
 *
 * Email delivery routes through the backend (SendGrid) to the user's
 * configured guardian email addresses.
 */

import type { FusedResult } from './emotionApi';
import { emailNotificationService } from './emailNotificationService';

export type AlertTrigger = 'REPEATED_NEGATIVE' | 'HIGH_INTENSITY' | 'PROLONGED_DISTRESS'; // HIGH_INTENSITY and PROLONGED_DISTRESS kept for existing DB records
export type AlertSeverity = 'warning' | 'critical';
export type AlertStatus = 'pending' | 'sent' | 'failed' | 'dismissed';

export interface GuardianAlert {
  id: string;
  trigger: AlertTrigger;
  severity: AlertSeverity;
  emotion: string;
  confidence: number;
  intensity: number;
  intensityLabel: string;
  message: string;
  guardianEmails: string[];
  status: AlertStatus;
  timestamp: number;
  sessionId: string;
  emailMessageId?: string;
  emailError?: string;
  simulated?: boolean;
}

const ALERT_STORAGE_KEY = 'empathai_guardian_alerts';
const MAX_ALERTS = 100;

export const NEGATIVE_EMOTIONS = new Set([
  'Sad', 'Anxious', 'Angry', 'Fearful', 'Disgusted', 'Distressed',
]);

// All 7 emotions tracked for consecutive detection
export const ALL_TRACKED_EMOTIONS = new Set([
  'Happy', 'Sad', 'Angry', 'Fearful', 'Disgusted', 'Surprised', 'Neutral',
  'Anxious', 'Distressed', // extended emotions
]);

const REPEATED_NEGATIVE_THRESHOLD = 3;

type AlertListener = (alert: GuardianAlert) => void;
type EmailSentListener = (alert: GuardianAlert) => void;

class GuardianAlertService {
  private listeners: Set<AlertListener> = new Set();
  private emailSentListeners: Set<EmailSentListener> = new Set();
  private consecutiveSameEmotionCount = 0;
  private lastPrimaryEmotion = '';
  private lastAlertTime: Record<AlertTrigger, number> = {
    REPEATED_NEGATIVE: 0,
    HIGH_INTENSITY: 0,
    PROLONGED_DISTRESS: 0,
  };
  private readonly alertCooldownMs = 10 * 60 * 1000;

  // ─── Public API ─────────────────────────────────────────────────────────────

  evaluate(result: FusedResult, sessionId: string, guardianEmails: string[]): GuardianAlert | null {
    if (guardianEmails.length === 0) return null;

    // Track consecutive same emotion across ALL 7 emotions
    if (result.emotion === this.lastPrimaryEmotion) {
      this.consecutiveSameEmotionCount++;
    } else {
      this.consecutiveSameEmotionCount = 1;
      this.lastPrimaryEmotion = result.emotion;
    }

    // Fire alert when same emotion detected 3 times in a row
    if (this.consecutiveSameEmotionCount >= REPEATED_NEGATIVE_THRESHOLD) {
      if (this.canFire('REPEATED_NEGATIVE')) {
        this.consecutiveSameEmotionCount = 0;
        return this.createAndSendAlert('REPEATED_NEGATIVE', 'warning', result, sessionId, guardianEmails);
      }
    }

    return null;
  }

  onAlert(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onEmailSent(listener: EmailSentListener): () => void {
    this.emailSentListeners.add(listener);
    return () => this.emailSentListeners.delete(listener);
  }

  loadAlerts(): GuardianAlert[] {
    try {
      const raw = localStorage.getItem(ALERT_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as GuardianAlert[];
    } catch {
      return [];
    }
  }

  dismissAlert(id: string): void {
    const alerts = this.loadAlerts().map((a) =>
      a.id === id ? { ...a, status: 'dismissed' as AlertStatus } : a
    );
    this.saveAlerts(alerts);
  }

  deleteAlert(id: string): void {
    const alerts = this.loadAlerts().filter((a) => a.id !== id);
    this.saveAlerts(alerts);
  }

  markSent(id: string, messageId?: string): void {
    const alerts = this.loadAlerts().map((a) =>
      a.id === id ? { ...a, status: 'sent' as AlertStatus, emailMessageId: messageId } : a
    );
    this.saveAlerts(alerts);
  }

  markFailed(id: string, error?: string): void {
    const alerts = this.loadAlerts().map((a) =>
      a.id === id ? { ...a, status: 'failed' as AlertStatus, emailError: error } : a
    );
    this.saveAlerts(alerts);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private canFire(trigger: AlertTrigger): boolean {
    const now = Date.now();
    if (now - this.lastAlertTime[trigger] < this.alertCooldownMs) return false;
    this.lastAlertTime[trigger] = now;
    return true;
  }

  private createAndSendAlert(
    trigger: AlertTrigger,
    severity: AlertSeverity,
    result: FusedResult,
    sessionId: string,
    guardianEmails: string[]
  ): GuardianAlert {
    const alert: GuardianAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      trigger,
      severity,
      emotion: result.emotion,
      confidence: result.confidence,
      intensity: result.intensity,
      intensityLabel: result.intensityLabel,
      message: this.buildMessage(trigger, result),
      guardianEmails,
      status: 'pending',
      timestamp: Date.now(),
      sessionId,
    };

    const existing = this.loadAlerts();
    this.saveAlerts([alert, ...existing].slice(0, MAX_ALERTS));

    this.listeners.forEach((l) => l(alert));

    // Send via real email API (or simulate if not configured)
    this.sendEmail(alert);

    return alert;
  }

  private async sendEmail(alert: GuardianAlert): Promise<void> {
    try {
      const result = await emailNotificationService.sendGuardianAlert(alert);
      if (result.success) {
        this.markSent(alert.id, result.messageId);
        if (result.simulated) {
          const alerts = this.loadAlerts().map((a) =>
            a.id === alert.id ? { ...a, simulated: true } : a
          );
          this.saveAlerts(alerts);
        }
        // Notify email-sent listeners
        const sentAlert = this.loadAlerts().find((a) => a.id === alert.id) || alert;
        this.emailSentListeners.forEach((l) => l(sentAlert));
      } else {
        this.markFailed(alert.id, result.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.markFailed(alert.id, message);
    }
  }

  private buildMessage(trigger: AlertTrigger, result: FusedResult): string {
    switch (trigger) {
      case 'REPEATED_NEGATIVE':
        return `${result.emotion} detected ${REPEATED_NEGATIVE_THRESHOLD} times in a row. Please check on the user.`;
      case 'HIGH_INTENSITY':
        return `High-intensity ${result.emotion.toLowerCase()} detected (${result.intensity}% intensity). Immediate attention may be needed.`;
      case 'PROLONGED_DISTRESS':
        return `Prolonged distress pattern detected. Please check on the user.`;
    }
  }

  private countRecentNegatives(): number {
    try {
      const raw = localStorage.getItem('empathai_emotion_history');
      if (!raw) return 0;
      const history = JSON.parse(raw) as Array<{ emotion: string; timestamp: number }>;
      const cutoff = Date.now() - PROLONGED_WINDOW_MS;
      return history.filter(
        (h) => h.timestamp >= cutoff && NEGATIVE_EMOTIONS.has(h.emotion)
      ).length;
    } catch {
      return 0;
    }
  }

  private saveAlerts(alerts: GuardianAlert[]): void {
    try {
      localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  }
}

export const guardianAlertService = new GuardianAlertService();
