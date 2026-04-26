import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.toLowerCase(), password: form.password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      setLoading(false);
      navigate('/analyze');
    } catch (error) {
      setError('Connection error. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: '#07070E' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(108,99,255,0.1) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="https://public.readdy.ai/ai/img_res/acc080fe-c99e-490b-9cf5-29b25915a85e.png"
            alt="EmpathAI"
            className="w-14 h-14 rounded-2xl object-cover mb-4"
          />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Welcome back
          </h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your EmpathAI account</p>
        </div>

        {/* Card */}
        <div
          className="p-8 rounded-2xl"
          style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                  <i className="ri-mail-line text-gray-500 text-sm"></i>
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"  
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all focus:ring-1"
                  style={{
                    background: '#1C1C28',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '14px',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                  <i className="ri-lock-line text-gray-500 text-sm"></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all"
                  style={{
                    background: '#1C1C28',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '14px',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                  <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-500 text-sm`}></i>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className="ri-error-warning-line text-sm"></i>
                </div>
                {error}
              </div>
            )}

            {/* Forgot password */}
            <div className="flex justify-end">
              <a href="#" rel="nofollow" className="text-xs cursor-pointer transition-colors" style={{ color: '#6C63FF' }}>
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)' }}
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-sm"></i>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          {/* <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
            <span className="text-gray-600 text-xs">or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
          </div> */}

          {/* Social */}
          {/* <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'ri-google-line', label: 'Google' },
              { icon: 'ri-github-line', label: 'GitHub' },
            ].map((s) => (
              <button
                key={s.label}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-gray-300 cursor-pointer whitespace-nowrap transition-all hover:text-white"
                style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={`${s.icon} text-sm`}></i>
                </div>
                {s.label}
              </button>
            ))}
          </div> */}
        </div>

        {/* Register link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="font-medium cursor-pointer transition-colors"
            style={{ color: '#6C63FF' }}
          >
            Create one
          </button>
        </p>

        {/* Back to home */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-400 text-xs cursor-pointer transition-colors"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-arrow-left-line text-xs"></i>
            </div>
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
