import { useNavigate } from 'react-router-dom';

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section
      className="relative py-32 px-6 overflow-hidden"
      style={{ background: '#0F0F18' }}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=abstract%20dark%20neural%20network%20brain%20waves%20glowing%20purple%20teal%20particles%20flowing%20energy%20digital%20art%20cinematic%20atmospheric%20deep%20space%20background%20minimal&width=1440&height=600&seq=cta-bg-1&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top opacity-20"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0F0F18 30%, rgba(15,15,24,0.7) 70%, #0F0F18)' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex-1">
          <h2
            className="text-5xl lg:text-7xl font-black text-white leading-none mb-6"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Start your<br />
            <span className="text-gradient-violet">emotional</span><br />
            journey
          </h2>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed">
            Join thousands of users who use EmpathAI to understand their emotions, track patterns, and build emotional resilience.
          </p>
        </div>

        <div className="flex flex-col items-center lg:items-end gap-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 px-8 py-4 rounded-full text-base font-semibold cursor-pointer whitespace-nowrap transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'white', color: '#07070E' }}
            >
              Begin Session
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#07070E' }}>
                <i className="ri-arrow-right-line text-white text-sm"></i>
              </div>
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 rounded-full text-base font-medium text-white cursor-pointer whitespace-nowrap border border-white/20 hover:border-white/40 transition-all"
            >
              Create Account
            </button>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-check-line text-green-400"></i>
              </div>
              Free to start
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-check-line text-green-400"></i>
              </div>
              No credit card
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-check-line text-green-400"></i>
              </div>
              Privacy first
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
