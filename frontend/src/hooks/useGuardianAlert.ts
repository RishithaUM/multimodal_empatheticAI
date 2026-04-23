import { useState, useEffect, useCallback } from 'react';
import { guardianAlertService } from '@/services/guardianAlertService';
import type { GuardianAlert } from '@/services/guardianAlertService';
import type { FusedResult } from '@/services/emotionApi';

const GUARDIAN_EMAILS_KEY = 'empathai_guardian_emails';

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
}

export function useGuardianAlert(): UseGuardianAlertReturn {
  const [alerts, setAlerts] = useState<GuardianAlert[]>(() =>
    guardianAlertService.loadAlerts()
  );
  const [activeAlert, setActiveAlert] = useState<GuardianAlert | null>(null);
  const [guardianEmails, setGuardianEmailsState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(GUARDIAN_EMAILS_KEY);
      return raw ? JSON.parse(raw) : ['guardian@example.com'];
    } catch {
      return ['guardian@example.com'];
    }
  });

  // Persist guardian emails whenever they change
  const setGuardianEmails = useCallback((emails: string[]) => {
    setGuardianEmailsState(emails);
    try {
      localStorage.setItem(GUARDIAN_EMAILS_KEY, JSON.stringify(emails));
    } catch {
      // ignore
    }
  }, []);

  // Subscribe to new alerts from the service
  useEffect(() => {
    const unsub = guardianAlertService.onAlert((alert) => {
      setAlerts(guardianAlertService.loadAlerts());
      setActiveAlert(alert);
    });
    return unsub;
  }, []);

  // Refresh alerts from storage periodically (for status updates like sent/failed)
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(guardianAlertService.loadAlerts());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const evaluate = useCallback(
    (result: FusedResult, sessionId: string) => {
      guardianAlertService.evaluate(result, sessionId, guardianEmails);
    },
    [guardianEmails]
  );

  const dismissActive = useCallback(() => {
    if (activeAlert) {
      guardianAlertService.dismissAlert(activeAlert.id);
      setActiveAlert(null);
      setAlerts(guardianAlertService.loadAlerts());
    }
  }, [activeAlert]);

  const dismissAlert = useCallback((id: string) => {
    guardianAlertService.dismissAlert(id);
    setAlerts(guardianAlertService.loadAlerts());
  }, []);

  const deleteAlert = useCallback((id: string) => {
    guardianAlertService.deleteAlert(id);
    setAlerts(guardianAlertService.loadAlerts());
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
  };
}
