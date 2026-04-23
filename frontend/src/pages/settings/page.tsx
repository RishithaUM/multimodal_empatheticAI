import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardianAlert } from '@/hooks/useGuardianAlert';
import { emailNotificationService } from '@/services/emailNotificationService';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { guardianEmails, setGuardianEmails } = useGuardianAlert();
  const [newEmail, setNewEmail] = useState('');

  // WebSocket config
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem('empathai_ws_url') || '');
  const [wsTestStatus, setWsTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  // Email API config
  const [emailApiUrl, setEmailApiUrl] = useState(() => emailNotificationService.getApiUrl());
  const [emailApiKey, setEmailApiKey] = useState(() => emailNotificationService.getApiKey());
  const [emailTestStatus, setEmailTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [emailTestLatency, setEmailTestLatency] = useState<number | null>(null);

  const [settings, setSettings] = useState({
    alertsEnabled: true,
    faceEnabled: true,
    voiceEnabled: true,
    dataStorage: true,
    emailNotifications: true,
  });
  const [profile, setProfile] = useState({ username: 'Alex Morgan', email: 'alex@empathai.app' });
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof settings) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const addEmail = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) && !guardianEmails.includes(newEmail)) {
      setGuardianEmails([...guardianEmails, newEmail]);
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => setGuardianEmails(guardianEmails.filter((e) => e !== email));

  // WebSocket test
  const testWsConnection = () => {
    if (!wsUrl) return;
    setWsTestStatus('testing');
    try {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => { ws.close(); setWsTestStatus('fail'); }, 5000);
      ws.onopen = () => { clearTimeout(timeout); ws.close(); setWsTestStatus('ok'); };
      ws.onerror = () => { clearTimeout(timeout); setWsTestStatus('fail'); };
    } catch {
      setWsTestStatus('fail');
    }
  };

  // Email API test
  const testEmailConnection = async () => {
    if (!emailApiUrl) return;
    setEmailTestStatus('testing');
    setEmailTestLatency(null);
    emailNotificationService.setApiUrl(emailApiUrl);
    emailNotificationService.setApiKey(emailApiKey);
    const result = await emailNotificationService.testConnection();
    if (result.ok) {
      setEmailTestStatus('ok');
      setEmailTestLatency(result.latencyMs ?? null);
    } else {
      setEmailTestStatus('fail');
    }
  };

  const handleSave = () => {
    if (wsUrl.trim()) {
      localStorage.setItem('empathai_ws_url', wsUrl.trim());
    } else {
      localStorage.removeItem('empathai_ws_url');
    }
    emailNotificationService.setApiUrl(emailApiUrl);
    emailNotificationService.setApiKey(emailApiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Toggle = ({ value, onToggle, color = '#6C63FF' }: { value: boolean; onToggle: () => void; color?: string }) => (
    <button
      onClick={onToggle}
      className="w-11 h-6 rounded-full transition-all relative cursor-pointer flex-shrink-0"
      style={{ background: value ? color : 'rgba(255,255,255,0.1)' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: value ? '22px' : '2px' }}
      />
    </button>
  );

  const statusColors = { idle: '#6B7280', testing: '#F59E0B', ok: '#00D4AA', fail: '#EF4444' };
  const statusIcons = { idle: 'ri-wifi-line', testing: 'ri-loader-4-line animate-spin', ok: 'ri-check-line', fail: 'ri-close-line' };

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Settings</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your profile, alerts, and backend connections</p>
          </div>
          <button
            onClick={() => navigate('/backend-setup')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all hover:opacity-80"
            style={{ background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.25)', color: '#6C63FF' }}
          >
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-server-line text-xs"></i>
            </div>
            Backend Setup Guide
          </button>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <div className="p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white text-sm font-semibold mb-5">User Profile</p>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #00D4AA)' }}>
                {profile.username.charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold">{profile.username}</p>
                <p className="text-gray-400 text-sm">{profile.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Username', key: 'username', value: profile.username },
                { label: 'Email', key: 'email', value: profile.email },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(108,99,255,0.5)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* WebSocket Server */}
          <div className="p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-white text-sm font-semibold">WebSocket Server</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA' }}>
                Real-time
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-5">
              Connect to your emotion detection backend. Leave empty to use the built-in simulated stream.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Server URL</label>
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => { setWsUrl(e.target.value); setWsTestStatus('idle'); }}
                  placeholder="wss://your-backend.com/ws/emotions"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(0,212,170,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={testWsConnection}
                  disabled={!wsUrl || wsTestStatus === 'testing'}
                  className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background: `${statusColors[wsTestStatus]}15`,
                    border: `1px solid ${statusColors[wsTestStatus]}30`,
                    color: statusColors[wsTestStatus],
                  }}
                >
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className={`${statusIcons[wsTestStatus]} text-xs`}></i>
                  </div>
                  {wsTestStatus === 'idle' ? 'Test Connection' : wsTestStatus === 'testing' ? 'Testing...' : wsTestStatus === 'ok' ? 'Connected!' : 'Failed'}
                </button>
                {wsUrl && (
                  <button
                    onClick={() => { setWsUrl(''); setWsTestStatus('idle'); localStorage.removeItem('empathai_ws_url'); }}
                    className="text-xs text-gray-500 hover:text-red-400 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
                <p className="text-gray-600 text-xs">{wsUrl ? 'Custom server configured' : 'Using simulated stream'}</p>
              </div>
            </div>
          </div>

          {/* Email API */}
          <div className="p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold">Email Alert API</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF' }}>
                  SendGrid / AWS SES
                </span>
              </div>
              <button
                onClick={() => navigate('/backend-setup')}
                className="text-xs cursor-pointer transition-colors hover:opacity-80"
                style={{ color: '#6C63FF' }}
              >
                Setup guide →
              </button>
            </div>
            <p className="text-gray-500 text-xs mb-5">
              Point to your backend endpoint that sends emails via SendGrid or AWS SES. Leave empty to simulate email sends.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">API Endpoint URL</label>
                <input
                  type="text"
                  value={emailApiUrl}
                  onChange={(e) => { setEmailApiUrl(e.target.value); setEmailTestStatus('idle'); }}
                  placeholder="https://your-backend.com/api/send-alert"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(108,99,255,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key (optional)</label>
                <input
                  type="password"
                  value={emailApiKey}
                  onChange={(e) => setEmailApiKey(e.target.value)}
                  placeholder="Bearer token or API key for your backend"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                  style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(108,99,255,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <p className="text-gray-600 text-xs mt-1">Sent as Authorization: Bearer &lt;key&gt; and X-API-Key headers</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={testEmailConnection}
                  disabled={!emailApiUrl || emailTestStatus === 'testing'}
                  className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    background: `${statusColors[emailTestStatus]}15`,
                    border: `1px solid ${statusColors[emailTestStatus]}30`,
                    color: statusColors[emailTestStatus],
                  }}
                >
                  <div className="w-3 h-3 flex items-center justify-center">
                    <i className={`${statusIcons[emailTestStatus]} text-xs`}></i>
                  </div>
                  {emailTestStatus === 'idle' ? 'Test Connection' : emailTestStatus === 'testing' ? 'Testing...' : emailTestStatus === 'ok' ? `Connected! ${emailTestLatency ? `(${emailTestLatency}ms)` : ''}` : 'Failed — check URL'}
                </button>
                {emailApiUrl && (
                  <button
                    onClick={() => { setEmailApiUrl(''); setEmailApiKey(''); setEmailTestStatus('idle'); emailNotificationService.setApiUrl(''); emailNotificationService.setApiKey(''); }}
                    className="text-xs text-gray-500 hover:text-red-400 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
                <p className="text-gray-600 text-xs">{emailApiUrl ? 'Real email delivery configured' : 'Simulating email sends'}</p>
              </div>
            </div>
          </div>

          {/* Guardian Emails */}
          <div className="p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white text-sm font-semibold mb-2">Guardian Emails</p>
            <p className="text-gray-500 text-xs mb-5">These contacts receive alerts when distress patterns are detected.</p>
            <div className="space-y-2 mb-4">
              {guardianEmails.map((email) => (
                <div key={email} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                  style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-shield-user-line text-xs" style={{ color: '#00D4AA' }}></i>
                    </div>
                    <span className="text-gray-300 text-sm">{email}</span>
                  </div>
                  <button onClick={() => removeEmail(email)} className="w-6 h-6 flex items-center justify-center cursor-pointer rounded-lg hover:bg-red-500/10 transition-colors">
                    <i className="ri-close-line text-xs text-red-400"></i>
                  </button>
                </div>
              ))}
              {guardianEmails.length === 0 && (
                <p className="text-gray-600 text-xs text-center py-3">No guardian emails added yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Add guardian email..."
                className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(0,212,170,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <button onClick={addEmail} className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap transition-all hover:opacity-90"
                style={{ background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.3)', color: '#00D4AA' }}>
                Add
              </button>
            </div>
          </div>

          {/* Alert Preferences */}
          <div className="p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white text-sm font-semibold mb-5">Alert Preferences</p>
            <div className="space-y-4">
              {[
                { key: 'alertsEnabled', label: 'Enable Guardian Alerts', desc: 'Send email alerts to guardians when distress is detected', color: '#EF4444' },
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive session summaries and weekly reports via email', color: '#6C63FF' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle value={settings[item.key as keyof typeof settings]} onToggle={() => toggle(item.key as keyof typeof settings)} color={item.color} />
                </div>
              ))}
            </div>
          </div>

          {/* System Controls */}
          <div className="p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white text-sm font-semibold mb-5">System Controls</p>
            <div className="space-y-4">
              {[
                { key: 'faceEnabled', label: 'Face Detection', desc: 'Enable webcam-based facial emotion analysis', icon: 'ri-camera-line', color: '#6C63FF' },
                { key: 'voiceEnabled', label: 'Voice Analysis', desc: 'Enable microphone-based voice tone analysis', icon: 'ri-mic-line', color: '#00D4AA' },
                { key: 'dataStorage', label: 'Data Storage', desc: 'Store analysis history locally for tracking and reports', icon: 'ri-database-line', color: '#F59E0B' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}18` }}>
                      <div className="w-4 h-4 flex items-center justify-center">
                        <i className={`${item.icon} text-sm`} style={{ color: item.color }}></i>
                      </div>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <Toggle value={settings[item.key as keyof typeof settings]} onToggle={() => toggle(item.key as keyof typeof settings)} color={item.color} />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background: saved ? 'rgba(0,212,170,0.2)' : 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
              border: saved ? '1px solid rgba(0,212,170,0.4)' : 'none',
              color: saved ? '#00D4AA' : '#fff',
            }}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className={`${saved ? 'ri-check-line' : 'ri-save-line'} text-sm`}></i>
            </div>
            {saved ? 'Settings Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
