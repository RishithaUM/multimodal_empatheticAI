const steps = [
  {
    step: '01',
    icon: 'ri-scan-line',
    title: 'Choose Your Inputs',
    description: 'Select any combination of face, voice, or text inputs. EmpathAI adapts to whatever modalities you have available.',
    color: '#6C63FF',
  },
  {
    step: '02',
    icon: 'ri-cpu-line',
    title: 'AI Fusion Analysis',
    description: 'Our multimodal fusion engine processes all inputs simultaneously, weighing each signal to produce a unified emotion reading.',
    color: '#00D4AA',
  },
  {
    step: '03',
    icon: 'ri-bar-chart-grouped-line',
    title: 'Explainable Results',
    description: 'Receive a detailed breakdown of how each modality contributed to the final emotion, with confidence scores and AI insights.',
    color: '#EC4899',
  },
  {
    step: '04',
    icon: 'ri-shield-user-line',
    title: 'Track & Alert',
    description: 'Build your emotion history over time. Guardian alerts notify trusted contacts when distress patterns are detected.',
    color: '#F59E0B',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6" style={{ background: '#07070E' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#00D4AA' }}>
            How It Works
          </p>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
            From Input to Insight
          </h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto">
            Four simple steps from raw input to actionable emotional intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <div key={step.step} className="relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className="hidden lg:block absolute top-10 left-full w-full h-px z-0"
                  style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.1), transparent)', width: 'calc(100% - 48px)', left: '48px' }}
                />
              )}

              <div
                className="relative z-10 p-6 rounded-2xl h-full"
                style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${step.color}18` }}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <i className={`${step.icon} text-xl`} style={{ color: step.color }}></i>
                    </div>
                  </div>
                  <span className="text-4xl font-black" style={{ color: `${step.color}30`, fontFamily: 'Sora, sans-serif' }}>
                    {step.step}
                  </span>
                </div>
                <h3 className="text-white font-bold text-base mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {step.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
