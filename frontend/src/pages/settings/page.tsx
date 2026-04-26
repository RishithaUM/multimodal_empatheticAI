import { useEffect, useState } from 'react';
import { useGuardianAlert } from '@/hooks/useGuardianAlert';

const API_BASE = 'http://localhost:5000';

export default function SettingsPage() {
  const { guardianEmails, setGuardianEmails } = useGuardianAlert();
  const [newEmail, setNewEmail] = useState('');

  const [profile, setProfile] = useState({ username: '', email: '' });
  const [initialProfile, setInitialProfile] = useState({ username: '', email: '' });
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      const fallback = {
        username: localStorage.getItem('empathai_user_name') || 'User',
        email: localStorage.getItem('empathai_user_email') || '',
      };
      setProfile(fallback);
      setInitialProfile(fallback);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          const loaded = {
            username: String(data.user.username || ''),
            email: String(data.user.email || ''),
          };
          setProfile(loaded);
          setInitialProfile(loaded);
          localStorage.setItem('empathai_user_name', loaded.username);
          localStorage.setItem('empathai_user_email', loaded.email);
        }
      })
      .catch(() => {
        // Keep page usable even if request fails.
      });
  }, []);

  const persistProfile = async (field: 'username' | 'email') => {
    const token = localStorage.getItem('token');
    const value = profile[field].trim();
    if (!token || value === initialProfile[field]) return;

    setProfileStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setProfileStatus('error');
        return;
      }

      const next = {
        username: String(data.user?.username || profile.username),
        email: String(data.user?.email || profile.email),
      };
      setProfile(next);
      setInitialProfile(next);
      localStorage.setItem('empathai_user_name', next.username);
      localStorage.setItem('empathai_user_email', next.email);
      setProfileStatus('saved');
      setTimeout(() => setProfileStatus('idle'), 1500);
    } catch {
      setProfileStatus('error');
    }
  };

  const addEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || guardianEmails.includes(email)) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setGuardianEmails([...guardianEmails, email]);
      setNewEmail('');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/settings/guardian-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.guardian_emails)) {
        setGuardianEmails(data.guardian_emails);
        setNewEmail('');
      }
    } catch {
      // no-op
    }
  };

  const removeEmail = async (email: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setGuardianEmails(guardianEmails.filter((e) => e !== email));
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/settings/guardian-emails/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.guardian_emails)) {
        setGuardianEmails(data.guardian_emails);
      }
    } catch {
      // no-op
    }
  };

  const handleSaveSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('empathai_user_name', profile.username.trim());
      localStorage.setItem('empathai_user_email', profile.email.trim());
      setProfileStatus('saved');
      setTimeout(() => setProfileStatus('idle'), 1500);
      return;
    }

    setProfileStatus('saving');
    try {
      const payload = {
        username: profile.username.trim(),
        email: profile.email.trim().toLowerCase(),
      };
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setProfileStatus('error');
        return;
      }

      const next = {
        username: String(data.user?.username || payload.username),
        email: String(data.user?.email || payload.email),
      };
      setProfile(next);
      setInitialProfile(next);
      localStorage.setItem('empathai_user_name', next.username);
      localStorage.setItem('empathai_user_email', next.email);
      setProfileStatus('saved');
      setTimeout(() => setProfileStatus('idle'), 1500);
    } catch {
      setProfileStatus('error');
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Settings</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your profile and guardian contacts</p>
          </div>
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
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                      persistProfile(f.key as 'username' | 'email');
                    }}
                  />
                </div>
              ))}
            </div>
            <p
              className="text-xs mt-3"
              style={{
                color:
                  profileStatus === 'saving'
                    ? '#F59E0B'
                    : profileStatus === 'saved'
                    ? '#00D4AA'
                    : profileStatus === 'error'
                    ? '#EF4444'
                    : '#6B7280',
              }}
            >
              {profileStatus === 'saving'
                ? 'Saving...'
                : profileStatus === 'saved'
                ? 'Saved in real time'
                : profileStatus === 'error'
                ? 'Failed to save changes'
                : 'Changes are saved automatically'}
            </p>
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

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background:
                profileStatus === 'saved'
                  ? 'rgba(0,212,170,0.2)'
                  : 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
              border: profileStatus === 'saved' ? '1px solid rgba(0,212,170,0.4)' : 'none',
              color: profileStatus === 'saved' ? '#00D4AA' : '#fff',
            }}
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className={`${profileStatus === 'saved' ? 'ri-check-line' : 'ri-save-line'} text-sm`}></i>
            </div>
            {profileStatus === 'saved' ? 'Settings Saved!' : 'Save Settings'}
          </button>

        </div>
      </div>
    </div>
  );
}
