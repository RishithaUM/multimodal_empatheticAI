import { useNavigate } from 'react-router-dom';

const featurePills = [
  { icon: 'ri-camera-line', label: 'Face Detection' },
  { icon: 'ri-mic-line', label: 'Voice Analysis' },
  { icon: 'ri-chat-3-line', label: 'Text Sentiment' },
  { icon: 'ri-cpu-line', label: 'Fusion Engine' },
  { icon: 'ri-shield-user-line', label: 'Guardian Alerts' },
];

const waveHeights = [8, 16, 24, 32, 24, 16, 8, 20, 28, 20, 12, 28, 16, 24, 12];

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20"
      style={{ background: '#07070E' }}
    >
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(108,99,255,0.12) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 75% 60%, rgba(0,212,170,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col lg:flex-row items-center gap-16 py-16">
        {/* Left Content */}
        <div className="flex-1 flex flex-col items-start animate-fade-in-up">
          {/* Badge */}
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase"
            style={{ border: '1px solid rgba(108,99,255,0.5)', color: '#8B5CF6', background: 'rgba(108,99,255,0.08)' }}
          >
            <span style={{ color: '#6C63FF' }}>✦</span>
            Multimodal Emotion AI
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: 'Sora, sans-serif' }}>
            Understand Every<br />
            Human{' '}
            <span className="text-gradient-violet">Emotion,</span>
            <br />
            In Real Time.
          </h1>

          <p className="text-lg text-gray-400 max-w-lg mb-10 leading-relaxed">
            EmpathAI combines face, voice, and text analysis to deliver real-time emotion detection with explainable AI insights — built for individuals, therapists, and researchers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-14">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 rounded-full text-base font-semibold text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)', boxShadow: '0 8px 32px rgba(108,99,255,0.35)' }}
            >
              Start Session
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-full text-base font-medium text-white cursor-pointer whitespace-nowrap border border-white/20 hover:border-white/40 transition-all"
            >
              Login
            </button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3">
            {featurePills.map((pill) => (
              <div
                key={pill.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-gray-300"
                style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={`${pill.icon} text-sm`} style={{ color: '#6C63FF' }}></i>
                </div>
                {pill.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right — Dashboard Mockup */}
        <div className="flex-1 flex justify-center lg:justify-end animate-float">
          <div
            className="relative w-full max-w-md rounded-2xl p-6"
            style={{
              background: '#13131A',
              border: '1px solid rgba(108,99,255,0.25)',
              boxShadow: '0 0 60px rgba(108,99,255,0.2)',
            }}
          >
            {/* Live badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Live Analysis</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-green-400 text-xs font-medium">LIVE</span>
              </div>
            </div>

            {/* Webcam preview */}
            <div className="relative rounded-xl overflow-hidden mb-4" style={{ height: '180px' }}>
              <img
                src="https://readdy.ai/api/search-image?query=person%20face%20close%20up%20neutral%20expression%20professional%20lighting%20dark%20background%20subtle%20blue%20tones%20high%20quality%20portrait%20photography%20cinematic&width=400&height=180&seq=hero-face-1&orientation=landscape"
                alt="Face detection preview"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }}></div>
              {/* Face bounding box */}
              <div
                className="absolute"
                style={{
                  top: '20%', left: '30%', width: '40%', height: '60%',
                  border: '2px solid #00D4AA',
                  borderRadius: '4px',
                }}
              >
                <div className="absolute -top-5 left-0 text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#00D4AA', color: '#000' }}>
                  Face Detected
                </div>
              </div>
            </div>

            {/* Emotion display */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Current Emotion</p>
                <p className="text-3xl font-bold" style={{ color: '#00D4AA', fontFamily: 'Sora, sans-serif' }}>Happy</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs mb-1">Confidence</p>
                <p className="text-2xl font-bold text-white">92%</p>
              </div>
            </div>

            {/* Waveform */}
            <div className="flex items-end gap-1 h-10 mb-4">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full animate-wave"
                  style={{
                    height: `${h}px`,
                    background: 'linear-gradient(to top, #6C63FF, #00D4AA)',
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>

            {/* Modality scores */}
            <div className="space-y-2">
              {[
                { label: 'Face', score: 89, color: '#6C63FF' },
                { label: 'Voice', score: 76, color: '#00D4AA' },
                { label: 'Text', score: 91, color: '#EC4899' },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-10">{m.label}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${m.score}%`, background: m.color }}
                    />
                  </div>
                  <span className="text-white text-xs w-8 text-right">{m.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-gray-500 text-xs">Scroll to explore</span>
        <div className="w-5 h-5 flex items-center justify-center">
          <i className="ri-arrow-down-line text-gray-500"></i>
        </div>
      </div>
    </section>
  );
}
