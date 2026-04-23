/**
 * Guardian Alert Service
 * Monitors emotion history for distress patterns and triggers alerts.
 *
 * Trigger conditions:
 * 1. REPEATED_NEGATIVE  — 3+ consecutive negative emotions
 * 2. HIGH_INTENSITY     — single negative emotion with intensity > 80
 * 3. PROLONGED_DISTRESS — 5+ negative emotions within a 30-min window
 *
 * Email delivery is handled by emailNotificationService.
 * Configure the email API endpoint in Settings → Email API.
 */

import type { FusedResult } from './emotionApi';
import { emailNotificationService } from './emailNotificationService';

export type AlertTrigger = 'REPEATED_NEGATIVE' | 'HIGH_INTENSITY' | 'PROLONGED_DISTRESS';
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

const REPEATED_NEGATIVE_THRESHOLD = 3;
const HIGH_INTENSITY_THRESHOLD = 80;
const PROLONGED_WINDOW_MS = 30 * 60 * 1000;
const PROLONGED_COUNT_THRESHOLD = 5;

type AlertListener = (alert: GuardianAlert) => void;

class GuardianAlertService {
  private listeners: Set<AlertListener> = new Set();
  private consecutiveNegativeCount = 0;
  private lastAlertTime: Record<AlertTrigger, number> = {
    REPEATED_NEGATIVE: 0,
    HIGH_INTENSITY: 0,
    PROLONGED_DISTRESS: 0,
  };
  private readonly alertCooldownMs = 10 * 60 * 1000;

  // ─── Public API ─────────────────────────────────────────────────────────────

  evaluate(result: FusedResult, sessionId: string, guardianEmails: string[]): GuardianAlert | null {
    if (guardianEmails.length === 0) return null;

    const isNegative = NEGATIVE_EMOTIONS.has(result.emotion);

    if (isNegative) {
      this.consecutiveNegativeCount++;
    } else {
      this.consecutiveNegativeCount = 0;
    }

    // HIGH_INTENSITY — most urgent, check first
    if (isNegative && result.intensity > HIGH_INTENSITY_THRESHOLD) {
      if (this.canFire('HIGH_INTENSITY')) {
        return this.createAndSendAlert('HIGH_INTENSITY', 'critical', result, sessionId, guardianEmails);
      }
    }

    // REPEATED_NEGATIVE
    if (this.consecutiveNegativeCount >= REPEATED_NEGATIVE_THRESHOLD) {
      if (this.canFire('REPEATED_NEGATIVE')) {
        this.consecutiveNegativeCount = 0;
        return this.createAndSendAlert('REPEATED_NEGATIVE', 'warning', result, sessionId, guardianEmails);
      }
    }

    // PROLONGED_DISTRESS
    if (isNegative) {
      const recentNegativeCount = this.countRecentNegatives();
      if (recentNegativeCount >= PROLONGED_COUNT_THRESHOLD) {
        if (this.canFire('PROLONGED_DISTRESS')) {
          return this.createAndSendAlert('PROLONGED_DISTRESS', 'critical', result, sessionId, guardianEmails);
        }
      }
    }

    return null;
  }

  onAlert(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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
          // Mark as simulated in storage
          const alerts = this.loadAlerts().map((a) =>
            a.id === alert.id ? { ...a, simulated: true } : a
          );
          this.saveAlerts(alerts);
        }
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
        return `${REPEATED_NEGATIVE_THRESHOLD} consecutive ${result.emotion.toLowerCase()} detections observed. User may need support.`;
      case 'HIGH_INTENSITY':
        return `High-intensity ${result.emotion.toLowerCase()} detected (${result.intensity}% intensity). Immediate attention may be needed.`;
      case 'PROLONGED_DISTRESS':
        return `Prolonged distress pattern detected: ${PROLONGED_COUNT_THRESHOLD}+ negative emotions within 30 minutes.`;
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
