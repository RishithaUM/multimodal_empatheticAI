import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleStartFree = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/register');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        navigate('/analyze');
        return;
      }
    } catch {
      // If auth check fails, treat user as logged out.
    }

    localStorage.removeItem('token');
    navigate('/register');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#07070E]/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="https://public.readdy.ai/ai/img_res/acc080fe-c99e-490b-9cf5-29b25915a85e.png"
            alt="EmpathAI"
            className="w-9 h-9 rounded-xl object-cover"
          />
          <span className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            EmpathAI
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'Pricing'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 rounded-full text-sm font-medium text-white border border-white/20 hover:border-white/40 transition-all cursor-pointer whitespace-nowrap"
          >
            Login
          </button>
          <button
            onClick={handleStartFree}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)' }}
          >
            Start Free
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden w-8 h-8 flex items-center justify-center cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <i className={mobileOpen ? 'ri-close-line text-white text-xl' : 'ri-menu-line text-white text-xl'}></i>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden px-6 pb-6 flex flex-col gap-4" style={{ background: '#0D0D14' }}>
          {['Features', 'How It Works'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-gray-300 text-sm font-medium py-2 border-b border-white/5"
              onClick={() => setMobileOpen(false)}
            >
              {item}
            </a>
          ))}
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-full text-sm font-medium text-white border border-white/20 cursor-pointer whitespace-nowrap"
          >
            Login
          </button>
          <button
            onClick={handleStartFree}
            className="w-full py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)' }}
          >
            Start Free
          </button>
        </div>
      )}
    </header>
  );
}
