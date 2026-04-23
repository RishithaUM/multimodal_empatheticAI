const testimonials = [
  {
    name: 'Dr. Sarah Chen',
    handle: '@dr.sarahchen',
    role: 'Clinical Psychologist',
    text: 'EmpathAI has transformed how I monitor my patients between sessions. The guardian alert system caught a distress episode I would have missed entirely.',
    avatar: 'SC',
    color: '#6C63FF',
  },
  {
    name: 'Marcus Williams',
    handle: '@marcusw',
    role: 'Wellness Coach',
    text: 'The multimodal fusion is genuinely impressive. It catches emotional nuances that single-modality tools completely miss. My clients love the explainable results.',
    avatar: 'MW',
    color: '#00D4AA',
  },
  {
    name: 'Priya Sharma',
    handle: '@priyasharma',
    role: 'UX Researcher',
    text: 'I use EmpathAI to study user emotional responses during testing sessions. The real-time dashboard and downloadable reports are exactly what I needed.',
    avatar: 'PS',
    color: '#EC4899',
  },
  {
    name: 'James O\'Brien',
    handle: '@jamesobrien',
    role: 'Parent & Guardian',
    text: 'As a parent of a teenager with anxiety, the guardian alerts give me peace of mind. I get notified when patterns suggest my child needs support.',
    avatar: 'JO',
    color: '#F59E0B',
  },
  {
    name: 'Dr. Aiko Tanaka',
    handle: '@dr.aiko',
    role: 'Neuroscience Researcher',
    text: 'The AI explainability features are outstanding for research purposes. Being able to see exactly how each modality contributes to the final output is invaluable.',
    avatar: 'AT',
    color: '#3B82F6',
  },
  {
    name: 'Elena Rodriguez',
    handle: '@elenarodriguez',
    role: 'Mental Health Advocate',
    text: 'EmpathAI helped me understand my own emotional patterns over months. The history tracking and analytics revealed triggers I never noticed before.',
    avatar: 'ER',
    color: '#8B5CF6',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-6" style={{ background: '#0A0A0F' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.2)' }}
            >
              Trusted by Users
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Real Emotions,<br />Real Impact.
            </h2>
          </div>
          <p className="text-gray-400 max-w-sm">
            Professionals, researchers, and individuals trust EmpathAI to understand and respond to human emotions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.handle}
              className="p-6 rounded-2xl"
              style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: `${t.color}30`, color: t.color }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.handle} · {t.role}</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">&ldquo;{t.text}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
