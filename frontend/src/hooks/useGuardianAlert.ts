import { useState, useEffect, useCallback } from 'react';
import { guardianAlertService } from '@/services/guardianAlertService';
import type { GuardianAlert } from '@/services/guardianAlertService';
import type { FusedResult } from '@/services/emotionApi';

const API_BASE = 'http://localhost:5000';

function parseBackendTimestamp(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return Date.now();
  const raw = value.trim();
  // Backend may return UTC datetimes without timezone (e.g. 2026-04-26T19:40:00.123456).
  // Treat those as UTC to avoid local-time drift in Alerts page.
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw) ? raw : `${raw}Z`;
  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? Date.now() : ms;
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

// Map backend MongoDB alert shape → frontend GuardianAlert shape
function mapBackendAlert(a: Record<string, unknown>): GuardianAlert {
  const ed = (a.emotion_data as Record<string, unknown>) || {};
  return {
    id: a._id as string,
    trigger: (a.alert_type as GuardianAlert['trigger']) || 'HIGH_INTENSITY',
    severity: (a.severity as GuardianAlert['severity']) || 'warning',
    emotion: (ed.emotion as string) || 'Unknown',
    confidence: (ed.confidence as number) || 0,
    intensity: (ed.intensity as number) || 0,
    intensityLabel: (ed.intensityLabel as string) || 'Medium',
    message: (a.message as string) || '',
    guardianEmails: (a.guardian_emails as string[]) || [],
    status: (a.status as GuardianAlert['status']) || 'pending',
    timestamp: parseBackendTimestamp(a.created_at),
    sessionId: (a.session_id as string) || '',
    emailMessageId: a.email_message_id as string | undefined,
    emailError: a.email_error as string | undefined,
    simulated: a.simulated as boolean | undefined,
  };
}

export interface UseGuardianAlertReturn {
  alerts: GuardianAlert[];
  activeAlert: GuardianAlert | null;
  guardianEmails: string[];
  setGuardianEmails: (emails: string[]) => void;
  evaluate: (result: FusedResult, sessionId: string) => void;
  dismissActive: () => void;
  dismissAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  unreadCount: number;
  emailSentMsg: string;
}

export function useGuardianAlert(): UseGuardianAlertReturn {
  const [alerts, setAlerts] = useState<GuardianAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<GuardianAlert | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [guardianEmails, setGuardianEmailsState] = useState<string[]>([]);
  const [emailSentMsg, setEmailSentMsg] = useState('');

  // Subscribe to email-sent events
  useEffect(() => {
    const unsub = guardianAlertService.onEmailSent((alert) => {
      const recipients = alert.guardianEmails.join(', ');
      setEmailSentMsg(`✅ Alert email sent to ${recipients} — ${alert.emotion} detected`);
      setTimeout(() => setEmailSentMsg(''), 7000);
    });
    return unsub;
  }, []);

  // Fetch guardian emails from backend settings
  const fetchGuardianEmails = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/guardian-emails`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { setIsUnauthorized(true); return; }
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.guardian_emails)) {
        setGuardianEmailsState(data.guardian_emails);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch all alerts from backend, returns true if successful
  const fetchFromBackend = useCallback(async (): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE}/api/alerts/history?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Token expired/invalid — clear stale localStorage data, show empty state
        setIsUnauthorized(true);
        localStorage.removeItem('empathai_guardian_alerts');
        setAlerts([]);
        return false;
      }
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && Array.isArray(data.alerts)) {
        setAlerts(data.alerts.map(mapBackendAlert));
        setBackendAvailable(true);
        setIsUnauthorized(false);
        return true;
      }
    } catch {
      // backend unreachable
    }
    return false;
  }, []);

  // Initial load: backend first, empty state if no token or unauthorized
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchGuardianEmails(token);
      fetchFromBackend();
    }
    // No token → show empty state (don't load stale localStorage mock data)
  }, [fetchFromBackend, fetchGuardianEmails]);

  // Listen for newly-created local alerts → persist to backend
  useEffect(() => {
    const unsub = guardianAlertService.onAlert(async (alert) => {
      const token = getToken();
      if (token) {
        try {
          await fetch(`${API_BASE}/api/alerts/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              alert_type: alert.trigger,
              severity: alert.severity,
              emotion_data: {
                emotion: alert.emotion,
                confidence: alert.confidence,
                intensity: alert.intensity,
                intensityLabel: alert.intensityLabel,
              },
              guardian_emails: alert.guardianEmails,
              session_id: alert.sessionId,
            }),
          });
        } catch {
          // ignore — still saved to localStorage
        }
        await fetchFromBackend();
      } else {
        setAlerts(guardianAlertService.loadAlerts());
      }
      setActiveAlert(alert);
    });
    return unsub;
  }, [fetchFromBackend]);

  // Periodic refresh — skip if unauthorized to avoid 401 spam
  useEffect(() => {
    const interval = setInterval(() => {
      if (isUnauthorized) return;
      if (backendAvailable) {
        fetchFromBackend();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [backendAvailable, isUnauthorized, fetchFromBackend]);

  const setGuardianEmails = useCallback((emails: string[]) => {
    setGuardianEmailsState(emails);
    // Persist to backend settings
    const token = getToken();
    if (token) {
      // sync each new email (add any not already in backend)
      // simplest: just update state; Settings page handles persistence via its own API calls
    }
  }, []);

  const evaluate = useCallback(
    (result: FusedResult, sessionId: string) => {
      guardianAlertService.evaluate(result, sessionId, guardianEmails);
    },
    [guardianEmails]
  );

  const dismissActive = useCallback(() => {
    if (!activeAlert) return;
    const id = activeAlert.id;
    guardianAlertService.dismissAlert(id);
    setActiveAlert(null);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'dismissed' as const } : a));
    const token = getToken();
    if (token) {
      fetch(`${API_BASE}/api/alerts/${id}/dismiss`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [activeAlert]);

  const dismissAlert = useCallback((id: string) => {
    guardianAlertService.dismissAlert(id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'dismissed' as const } : a));
    const token = getToken();
    if (token) {
      fetch(`${API_BASE}/api/alerts/${id}/dismiss`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const deleteAlert = useCallback((id: string) => {
    guardianAlertService.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const token = getToken();
    if (token) {
      fetch(`${API_BASE}/api/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, []);

  const unreadCount = alerts.filter((a) => a.status === 'pending').length;

  return {
    alerts,
    activeAlert,
    guardianEmails,
    setGuardianEmails,
    evaluate,
    dismissActive,
    dismissAlert,
    deleteAlert,
    unreadCount,
    emailSentMsg,
  };
}

