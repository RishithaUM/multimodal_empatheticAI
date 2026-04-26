const features = [
  {
    icon: 'ri-camera-ai-line',
    title: 'Multimodal Input',
    description: 'Analyze emotions through face detection, voice tone, and text sentiment — simultaneously or in any combination.',
    color: '#6C63FF',
    pills: ['Face', 'Voice', 'Text'],
    wide: true,
  },
  {
    icon: 'ri-bar-chart-grouped-line',
    title: 'Live Analysis Results',
    description: 'Instant emotion results with confidence scores and per-modality breakdowns showing exactly what each model detected.',
    color: '#00D4AA',
    wide: false,
  },
  {
    icon: 'ri-brain-line',
    title: 'AI Explainability',
    description: 'See how each modality (face, voice, text) contributed to the final fused emotion label with weighted confidence scores.',
    color: '#EC4899',
    wide: false,
  },
  {
    icon: 'ri-history-line',
    title: 'Session History',
    description: 'Every analysis is stored in MongoDB. Browse, filter, and review your complete emotion history across all sessions.',
    color: '#F59E0B',
    wide: false,
  },
  {
    icon: 'ri-shield-user-line',
    title: 'Guardian Alerts',
    description: 'Trusted contacts are automatically emailed via SendGrid when distress emotions (angry, fear, sad) are repeatedly detected.',
    color: '#EF4444',
    wide: false,
  },
  {
    icon: 'ri-chat-smile-3-line',
    title: 'AI Chat Assistant',
    description: 'Chat with a local LLM (llama3.1:8b via Ollama) that knows your emotional state and responds with empathy.',
    color: '#3B82F6',
    wide: false,
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6" style={{ background: '#0F0F18' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#6C63FF' }}>
              Platform Features
            </p>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
              Everything You Need<br />
              <span className="text-gradient-violet">to Feel Understood</span>
            </h2>
          </div>
          <p className="text-gray-400 text-base max-w-sm leading-relaxed">
            A complete emotional intelligence platform designed for real-world use — from personal wellness to clinical research.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] cursor-default"
              style={{
                background: '#1C1C28',
                border: '1px solid rgba(255,255,255,0.06)',
                animationDelay: `${idx * 0.1}s`,
              }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `${feature.color}18` }}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className={`${feature.icon} text-xl`} style={{ color: feature.color }}></i>
                </div>
              </div>

              <h3 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{feature.description}</p>

              {feature.pills && (
                <div className="flex gap-2 flex-wrap">
                  {feature.pills.map((pill) => (
                    <span
                      key={pill}
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{ background: `${feature.color}18`, color: feature.color }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}

              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `inset 0 0 0 1px ${feature.color}30` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
