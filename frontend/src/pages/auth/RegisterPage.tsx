import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormState {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  guardianEmail: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    guardianEmail: '',
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {};
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Please enter a valid email';
    if (!form.username.trim()) newErrors.username = 'Username is required';
    else if (form.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (form.guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guardianEmail)) {
      newErrors.guardianEmail = 'Please enter a valid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          password: form.password,
          guardian_email: form.guardianEmail || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors({ username: data.error || 'Registration failed' });
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => navigate('/analyze'), 2000);
    } catch (error) {
      setErrors({ username: 'Connection error. Is the backend running?' });
      setLoading(false);
    }
  };

  const inputClass = (field: keyof FormState) =>
    `w-full py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all ${
      errors[field] ? 'border-red-500/50' : ''
    }`;

  const inputStyle = (field: keyof FormState, hasLeftIcon = true, hasRightIcon = false) => ({
    background: '#1C1C28',
    border: `1px solid ${errors[field] ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
    fontSize: '14px',
    paddingLeft: hasLeftIcon ? '40px' : '16px',
    paddingRight: hasRightIcon ? '48px' : '16px',
  });

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#07070E' }}
      >
        <div className="text-center animate-fade-in-up">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(0,212,170,0.15)', border: '2px solid #00D4AA' }}
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <i className="ri-check-line text-3xl" style={{ color: '#00D4AA' }}></i>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Account Created!
          </h2>
          <p className="text-gray-400 text-sm">Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: '#07070E' }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(0,212,170,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="https://public.readdy.ai/ai/img_res/acc080fe-c99e-490b-9cf5-29b25915a85e.png"
            alt="EmpathAI"
            className="w-14 h-14 rounded-2xl object-cover mb-4"
          />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            Create your account
          </h1>
          <p className="text-gray-400 text-sm mt-1">Start your emotional intelligence journey</p>
        </div>

        {/* Card */}
        <div
          className="p-8 rounded-2xl"
          style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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
                  placeholder="your@email.com"
                  className={inputClass('email')}
                  style={inputStyle('email')}
                  onFocus={(e) => { if (!errors.email) e.target.style.borderColor = 'rgba(108,99,255,0.6)'; }}
                  onBlur={(e) => { if (!errors.email) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                  <i className="ri-user-line text-gray-500 text-sm"></i>
                </div>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  className={inputClass('username')}
                  style={inputStyle('username')}
                  onFocus={(e) => { if (!errors.username) e.target.style.borderColor = 'rgba(108,99,255,0.6)'; }}
                  onBlur={(e) => { if (!errors.username) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
              </div>
              {errors.username && <p className="text-red-400 text-xs mt-1.5">{errors.username}</p>}
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
                  placeholder="Create a strong password"
                  className={inputClass('password')}
                  style={inputStyle('password', true, true)}
                  onFocus={(e) => { if (!errors.password) e.target.style.borderColor = 'rgba(108,99,255,0.6)'; }}
                  onBlur={(e) => { if (!errors.password) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                  <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-500 text-sm`}></i>
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>}
              {/* Password strength */}
              {form.password && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all"
                      style={{
                        background: form.password.length >= i * 2
                          ? i <= 1 ? '#EF4444' : i <= 2 ? '#F59E0B' : i <= 3 ? '#3B82F6' : '#00D4AA'
                          : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                  <i className="ri-lock-password-line text-gray-500 text-sm"></i>
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={inputClass('confirmPassword')}
                  style={inputStyle('confirmPassword', true, true)}
                  onFocus={(e) => { if (!errors.confirmPassword) e.target.style.borderColor = 'rgba(108,99,255,0.6)'; }}
                  onBlur={(e) => { if (!errors.confirmPassword) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer"
                >
                  <i className={`${showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-500 text-sm`}></i>
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1.5">{errors.confirmPassword}</p>}
            </div>

            {/* Guardian Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Guardian Email
                <span className="ml-2 text-xs text-gray-500 font-normal">(Optional — for alert notifications)</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                  <i className="ri-shield-user-line text-gray-500 text-sm"></i>
                </div>
                <input
                  type="email"
                  name="guardianEmail"
                  value={form.guardianEmail}
                  onChange={handleChange}
                  placeholder="guardian@example.com"
                  className={inputClass('guardianEmail')}
                  style={inputStyle('guardianEmail')}
                  onFocus={(e) => { if (!errors.guardianEmail) e.target.style.borderColor = 'rgba(0,212,170,0.5)'; }}
                  onBlur={(e) => { if (!errors.guardianEmail) e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
              </div>
              {errors.guardianEmail && <p className="text-red-400 text-xs mt-1.5">{errors.guardianEmail}</p>}
              <p className="text-gray-600 text-xs mt-1.5">
                This person will receive alerts if distress patterns are detected.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)' }}
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-sm"></i>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-medium cursor-pointer transition-colors"
            style={{ color: '#6C63FF' }}
          >
            Sign in
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
