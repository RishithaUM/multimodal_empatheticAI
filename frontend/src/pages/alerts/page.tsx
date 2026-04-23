import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardianAlert } from '@/hooks/useGuardianAlert';
import type { GuardianAlert, AlertTrigger, AlertSeverity } from '@/services/guardianAlertService';
import { NEGATIVE_EMOTIONS } from '@/services/guardianAlertService';
import { emailNotificationService } from '@/services/emailNotificationService';

// ─── Config maps ─────────────────────────────────────────────────────────────

const triggerLabels: Record<AlertTrigger, string> = {
  REPEATED_NEGATIVE: 'Repeated Negative',
  HIGH_INTENSITY: 'High Intensity',
  PROLONGED_DISTRESS: 'Prolonged Distress',
};

const triggerIcons: Record<AlertTrigger, string> = {
  REPEATED_NEGATIVE: 'ri-repeat-line',
  HIGH_INTENSITY: 'ri-bar-chart-fill',
  PROLONGED_DISTRESS: 'ri-timer-flash-line',
};

const severityConfig: Record<AlertSeverity, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', label: 'Critical' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', label: 'Warning' },
};

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  sent: { color: '#00D4AA', bg: 'rgba(0,212,170,0.1)', icon: 'ri-mail-check-line', label: 'Email Sent' },
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: 'ri-mail-send-line', label: 'Sending...' },
  failed: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: 'ri-mail-close-line', label: 'Email Failed' },
  dismissed: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: 'ri-eye-off-line', label: 'Dismissed' },
};

const triggerConditions = [
  {
    icon: 'ri-repeat-line',
    color: '#6C63FF',
    title: 'Repeated Negative Emotions',
    description: `3 or more consecutive detections of negative emotions (${[...NEGATIVE_EMOTIONS].join(', ')}) trigger a warning alert.`,
  },
  {
    icon: 'ri-bar-chart-fill',
    color: '#EF4444',
    title: 'High Intensity Distress',
    description: 'Any single detection where a negative emotion exceeds 80% intensity triggers an immediate critical alert.',
  },
  {
    icon: 'ri-timer-flash-line',
    color: '#F59E0B',
    title: 'Prolonged Distress',
    description: '5 or more negative emotion detections within a 30-minute window trigger a critical prolonged distress alert.',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmailStatusBadge({ alert, onResend, resending }: {
  alert: GuardianAlert;
  onResend: (alert: GuardianAlert) => void;
  resending: boolean;
}) {
  const sc = statusConfig[alert.status] ?? statusConfig.pending;
  const isSimulated = alert.simulated;

  return (
    <div className="flex flex-col gap-1">
      <span
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit"
        style={{ background: sc.bg, color: sc.color }}
      >
        <div className="w-3 h-3 flex items-center justify-center">
          <i className={`${sc.icon} text-xs ${alert.status === 'pending' ? 'animate-pulse' : ''}`}></i>
        </div>
        {sc.label}
        {isSimulated && alert.status === 'sent' && (
          <span className="opacity-60">(simulated)</span>
        )}
      </span>

      {/* Resend button for failed */}
      {alert.status === 'failed' && (
        <button
          onClick={() => onResend(alert)}
          disabled={resending}
          className="flex items-center gap-1 text-xs cursor-pointer whitespace-nowrap transition-all hover:opacity-80 disabled:opacity-40"
          style={{ color: '#F59E0B' }}
        >
          <div className="w-3 h-3 flex items-center justify-center">
            <i className={`${resending ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'} text-xs`}></i>
          </div>
          {resending ? 'Resending...' : 'Resend email'}
        </button>
      )}

      {/* Error tooltip */}
      {alert.emailError && alert.status === 'failed' && (
        <p className="text-xs text-red-400 opacity-70 max-w-[140px] truncate" title={alert.emailError}>
          {alert.emailError}
        </p>
      )}
    </div>
  );
}

function AlertBanner({ alert, onDismiss }: { alert: GuardianAlert; onDismiss: () => void }) {
  const sc = severityConfig[alert.severity];
  return (
    <div
      className="p-5 rounded-2xl mb-6 flex items-start justify-between gap-4"
      style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${sc.color}20` }}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <i className="ri-alarm-warning-fill text-lg animate-pulse" style={{ color: sc.color }}></i>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-white font-semibold text-sm">{sc.label} Alert — {triggerLabels[alert.trigger]}</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${sc.color}18`, color: sc.color }}
            >
              {alert.emotion} · {alert.intensity}% intensity
            </span>
          </div>
          <p className="text-gray-300 text-sm">{alert.message}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <p className="text-gray-500 text-xs">
              {new Date(alert.timestamp).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true,
              })}
            </p>
            {alert.guardianEmails.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 flex items-center justify-center">
                  <i className="ri-mail-send-line text-xs text-gray-400"></i>
                </div>
                <p className="text-gray-400 text-xs">
                  Notifying: <span className="text-white font-medium">{alert.guardianEmails.join(', ')}</span>
                </p>
              </div>
            )}
            {/* Email status in banner */}
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{
                background: statusConfig[alert.status]?.bg || 'rgba(107,114,128,0.1)',
                color: statusConfig[alert.status]?.color || '#6B7280',
              }}
            >
              <i className={`${statusConfig[alert.status]?.icon || 'ri-time-line'} text-xs`}></i>
              {statusConfig[alert.status]?.label || 'Unknown'}
              {alert.simulated && alert.status === 'sent' && ' (simulated)'}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-white/10 flex-shrink-0"
        style={{ color: sc.color }}
      >
        <i className="ri-close-line text-sm"></i>
      </button>
    </div>
  );
}

function AlertRow({ alert, onDismiss, onDelete, onResend, resendingId }: {
  alert: GuardianAlert;
  onDismiss: (id: string) => void;
  onDelete: (id: string) => void;
  onResend: (alert: GuardianAlert) => void;
  resendingId: string | null;
}) {
  const sev = severityConfig[alert.severity];
  const trig = triggerLabels[alert.trigger];
  const trigIcon = triggerIcons[alert.trigger];

  return (
    <div
      className="grid gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
      style={{
        gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.8fr auto',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Timestamp + severity */}
      <div>
        <p className="text-white text-sm font-medium">
          {new Date(alert.timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
          })}
        </p>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
          style={{ background: sev.bg, color: sev.color }}
        >
          {sev.label}
        </span>
      </div>

      {/* Trigger */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 flex items-center justify-center">
          <i className={`${trigIcon} text-xs text-gray-400`}></i>
        </div>
        <span className="text-gray-300 text-sm">{trig}</span>
      </div>

      {/* Emotion */}
      <div>
        <p className="text-white text-sm">{alert.emotion}</p>
        <p className="text-gray-500 text-xs">{alert.intensityLabel} intensity</p>
      </div>

      {/* Guardian emails */}
      <div>
        {alert.guardianEmails.length > 0 ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 flex items-center justify-center">
                <i className="ri-mail-line text-xs text-gray-500"></i>
              </div>
              <p className="text-gray-300 text-xs truncate max-w-[130px]">
                {alert.guardianEmails[0]}
              </p>
            </div>
            {alert.guardianEmails.length > 1 && (
              <p className="text-gray-600 text-xs mt-0.5 ml-4">+{alert.guardianEmails.length - 1} more</p>
            )}
          </>
        ) : (
          <p className="text-gray-600 text-xs">No guardian set</p>
        )}
      </div>

      {/* Email status */}
      <EmailStatusBadge
        alert={alert}
        onResend={onResend}
        resending={resendingId === alert.id}
      />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {alert.status !== 'dismissed' && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
            title="Dismiss"
          >
            <i className="ri-eye-off-line text-xs text-gray-500"></i>
          </button>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <i className="ri-delete-bin-line text-xs text-red-400"></i>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const navigate = useNavigate();
  const { alerts, activeAlert, dismissActive, dismissAlert, deleteAlert, unreadCount, guardianEmails } = useGuardianAlert();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'sent' | 'pending' | 'failed'>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [testEmailMsg, setTestEmailMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'critical' || filter === 'warning') return a.severity === filter;
    return a.status === filter;
  });

  const filterOptions: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning', label: 'Warning' },
    { key: 'pending', label: 'Pending' },
    { key: 'sent', label: 'Sent' },
    { key: 'failed', label: 'Failed' },
  ];

  // Resend a failed alert email
  const handleResend = useCallback(async (alert: GuardianAlert) => {
    if (resendingId) return;
    setResendingId(alert.id);
    try {
      const result = await emailNotificationService.sendGuardianAlert(alert);
      if (result.success) {
        // Update status in storage via service
        const { guardianAlertService } = await import('@/services/guardianAlertService');
        guardianAlertService.markSent(alert.id, result.messageId);
        showToast(result.simulated
          ? 'Email simulated (no API configured). Configure Email API in Settings.'
          : 'Email resent successfully!');
      } else {
        const { guardianAlertService } = await import('@/services/guardianAlertService');
        guardianAlertService.markFailed(alert.id, result.error);
        showToast(`Resend failed: ${result.error}`);
      }
    } catch (err) {
      showToast('Resend failed — check your Email API settings.');
    } finally {
      setResendingId(null);
    }
  }, [resendingId]);

  // Send a test email to all guardian emails
  const handleSendTestEmail = useCallback(async () => {
    if (guardianEmails.length === 0) {
      showToast('No guardian emails configured. Add one in Settings first.');
      return;
    }
    setTestEmailStatus('sending');
    setTestEmailMsg('');

    const testAlert = {
      id: `test_${Date.now()}`,
      trigger: 'HIGH_INTENSITY' as const,
      severity: 'warning' as const,
      emotion: 'Anxious',
      confidence: 85,
      intensity: 82,
      intensityLabel: 'High',
      message: 'This is a test alert from EmpathAI to verify your guardian notification setup.',
      guardianEmails,
      status: 'pending' as const,
      timestamp: Date.now(),
      sessionId: 'test-session',
    };

    try {
      const result = await emailNotificationService.sendGuardianAlert(testAlert);
      if (result.success) {
        setTestEmailStatus('sent');
        setTestEmailMsg(result.simulated
          ? `Simulated — no Email API configured. Configure it in Settings to send real emails to: ${guardianEmails.join(', ')}`
          : `Test email sent to: ${guardianEmails.join(', ')}`);
      } else {
        setTestEmailStatus('failed');
        setTestEmailMsg(result.error || 'Unknown error');
      }
    } catch {
      setTestEmailStatus('failed');
      setTestEmailMsg('Network error — check your Email API settings.');
    }

    setTimeout(() => setTestEmailStatus('idle'), 6000);
  }, [guardianEmails]);

  const testBtnConfig = {
    idle: { label: 'Send Test Email', icon: 'ri-mail-send-line', color: '#6C63FF', bg: 'rgba(108,99,255,0.12)', border: 'rgba(108,99,255,0.25)' },
    sending: { label: 'Sending...', icon: 'ri-loader-4-line animate-spin', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    sent: { label: 'Email Sent!', icon: 'ri-check-line', color: '#00D4AA', bg: 'rgba(0,212,170,0.1)', border: 'rgba(0,212,170,0.25)' },
    failed: { label: 'Send Failed', icon: 'ri-close-line', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  };
  const tbc = testBtnConfig[testEmailStatus];

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>

      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm text-white max-w-sm"
          style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Guardian Alerts
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time distress monitoring and guardian email notifications</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {unreadCount > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium animate-pulse"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {unreadCount} pending alert{unreadCount > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9CA3AF' }}
          >
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-settings-3-line text-xs"></i>
            </div>
            Configure Emails
          </button>
        </div>
      </div>

      {/* Active Alert Banner */}
      {activeAlert && activeAlert.status !== 'dismissed' && (
        <AlertBanner alert={activeAlert} onDismiss={dismissActive} />
      )}

      {/* Guardian Email Status Card */}
      <div
        className="p-5 rounded-2xl mb-6"
        style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: guardianEmails.length > 0 ? 'rgba(0,212,170,0.12)' : 'rgba(245,158,11,0.12)' }}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i
                  className={`${guardianEmails.length > 0 ? 'ri-shield-user-line' : 'ri-shield-line'} text-lg`}
                  style={{ color: guardianEmails.length > 0 ? '#00D4AA' : '#F59E0B' }}
                ></i>
              </div>
            </div>
            <div>
              <p className="text-white text-sm font-semibold mb-1">Guardian Email Recipients</p>
              {guardianEmails.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {guardianEmails.map((email) => (
                    <span
                      key={email}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', color: '#00D4AA' }}
                    >
                      <div className="w-3 h-3 flex items-center justify-center">
                        <i className="ri-mail-line text-xs"></i>
                      </div>
                      {email}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-yellow-400 text-xs">
                  No guardian emails configured —{' '}
                  <button onClick={() => navigate('/settings')} className="underline cursor-pointer">
                    add one in Settings
                  </button>
                </p>
              )}
              {!emailNotificationService.isConfigured() && (
                <p className="text-gray-500 text-xs mt-1.5">
                  Email API not configured — alerts will be simulated.{' '}
                  <button onClick={() => navigate('/settings')} className="text-gray-300 underline cursor-pointer">
                    Set up Email API →
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Test email button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              onClick={handleSendTestEmail}
              disabled={testEmailStatus === 'sending'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: tbc.bg, border: `1px solid ${tbc.border}`, color: tbc.color }}
            >
              <div className="w-3.5 h-3.5 flex items-center justify-center">
                <i className={`${tbc.icon} text-xs`}></i>
              </div>
              {tbc.label}
            </button>
            {testEmailMsg && (
              <p
                className="text-xs max-w-xs text-right"
                style={{ color: testEmailStatus === 'sent' ? '#00D4AA' : '#EF4444' }}
              >
                {testEmailMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Alerts', value: alerts.length, color: '#6C63FF', icon: 'ri-alarm-warning-line' },
          { label: 'Critical', value: alerts.filter((a) => a.severity === 'critical').length, color: '#EF4444', icon: 'ri-error-warning-line' },
          { label: 'Emails Sent', value: alerts.filter((a) => a.status === 'sent').length, color: '#00D4AA', icon: 'ri-mail-check-line' },
          { label: 'Failed / Pending', value: alerts.filter((a) => a.status === 'failed' || a.status === 'pending').length, color: '#F59E0B', icon: 'ri-mail-close-line' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${stat.color}18` }}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${stat.icon} text-lg`} style={{ color: stat.color }}></i>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>{stat.value}</p>
              <p className="text-gray-500 text-xs">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert History Table */}
      <div
        className="rounded-2xl mb-6 overflow-hidden"
        style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Table header + filters */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-semibold">Alert History</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,99,255,0.1)', color: '#8B5CF6' }}>
              {filteredAlerts.length} record{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
                style={{
                  background: filter === opt.key ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.05)',
                  color: filter === opt.key ? '#8B5CF6' : '#6B7280',
                  border: filter === opt.key ? '1px solid rgba(108,99,255,0.3)' : '1px solid transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Column headers */}
        <div
          className="grid gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
          style={{
            gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.8fr auto',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <span>Timestamp</span>
          <span>Trigger</span>
          <span>Emotion</span>
          <span>Guardian Email</span>
          <span>Email Status</span>
          <span>Actions</span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <i className="ri-shield-check-line text-2xl text-gray-600"></i>
            </div>
            <p className="text-gray-500 text-sm">No alerts found</p>
            <p className="text-gray-600 text-xs">Guardian alerts will appear here when distress patterns are detected</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onDismiss={dismissAlert}
              onDelete={deleteAlert}
              onResend={handleResend}
              resendingId={resendingId}
            />
          ))
        )}
      </div>

      {/* How email delivery works */}
      <div
        className="p-6 rounded-2xl mb-6"
        style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'rgba(0,212,170,0.12)' }}>
            <i className="ri-mail-settings-line text-sm" style={{ color: '#00D4AA' }}></i>
          </div>
          <p className="text-white text-sm font-semibold">How Email Delivery Works</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              icon: 'ri-scan-line',
              color: '#6C63FF',
              title: 'Distress Detected',
              desc: 'EmpathAI detects a negative emotion pattern that meets one of the trigger conditions.',
            },
            {
              step: '02',
              icon: 'ri-mail-send-line',
              color: '#F59E0B',
              title: 'Email Dispatched',
              desc: 'An alert email is automatically sent to all configured guardian email addresses via your Email API.',
            },
            {
              step: '03',
              icon: 'ri-mail-check-line',
              color: '#00D4AA',
              title: 'Delivery Confirmed',
              desc: 'Status updates to "Email Sent". Failed deliveries can be resent manually from this page.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="p-4 rounded-xl"
              style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}18` }}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={`${item.icon} text-sm`} style={{ color: item.color }}></i>
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: item.color }}>{item.step}</span>
              </div>
              <p className="text-white text-sm font-semibold mb-1.5">{item.title}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Setup CTA if not configured */}
        {!emailNotificationService.isConfigured() && (
          <div
            className="mt-4 p-4 rounded-xl flex items-center justify-between gap-4"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-information-line text-sm" style={{ color: '#F59E0B' }}></i>
              </div>
              <p className="text-yellow-300 text-xs">
                Email API not configured — alerts are currently being simulated. Set up your Email API to send real notifications.
              </p>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-80 flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B' }}
            >
              Configure Now
            </button>
          </div>
        )}
      </div>

      {/* Trigger Conditions */}
      <div
        className="p-6 rounded-2xl"
        style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <p className="text-white text-sm font-semibold">Alert Trigger Conditions</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(108,99,255,0.1)', color: '#8B5CF6' }}
          >
            Auto-monitored
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {triggerConditions.map((tc) => (
            <div
              key={tc.title}
              className="p-4 rounded-xl"
              style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${tc.color}18` }}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <i className={`${tc.icon} text-lg`} style={{ color: tc.color }}></i>
                </div>
              </div>
              <p className="text-white text-sm font-semibold mb-2">{tc.title}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{tc.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
