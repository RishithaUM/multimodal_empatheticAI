import { useNavigate } from 'react-router-dom';

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer style={{ background: '#0D0D14', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://public.readdy.ai/ai/img_res/acc080fe-c99e-490b-9cf5-29b25915a85e.png"
                alt="EmpathAI"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="text-white font-bold text-xl" style={{ fontFamily: 'Sora, sans-serif' }}>EmpathAI</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
              The world&apos;s most advanced multimodal emotion AI platform. Understand every human emotion in real time.
            </p>
            <div className="flex items-center gap-3">
              {['ri-twitter-x-line', 'ri-linkedin-line', 'ri-github-line', 'ri-discord-line'].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  rel="nofollow"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <i className={`${icon} text-sm`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#features"
                  onClick={(e) => { e.preventDefault(); scrollTo('features'); }}
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={(e) => { e.preventDefault(); scrollTo('how-it-works'); }}
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => { e.preventDefault(); scrollTo('features'); }}
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => { e.preventDefault(); scrollTo('about'); }}
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#about"
                  onClick={(e) => { e.preventDefault(); scrollTo('about'); }}
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => { e.preventDefault(); scrollTo('features'); }}
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  rel="nofollow"
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  rel="nofollow"
                  className="text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-gray-500 text-sm">
            &copy; 2026 EmpathAI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" rel="nofollow" className="text-gray-500 hover:text-gray-300 text-sm transition-colors cursor-pointer">Privacy</a>
            <a href="#" rel="nofollow" className="text-gray-500 hover:text-gray-300 text-sm transition-colors cursor-pointer">Terms</a>
            <a href="#" rel="nofollow" className="text-gray-500 hover:text-gray-300 text-sm transition-colors cursor-pointer">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
