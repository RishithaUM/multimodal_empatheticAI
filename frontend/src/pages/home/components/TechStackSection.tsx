import { useState } from 'react';

const techStack = [
  {
    category: 'AI & ML',
    items: [
      { name: 'TensorFlow', icon: 'ri-brain-line', desc: 'Deep learning emotion models' },
      { name: 'PyTorch', icon: 'ri-cpu-line', desc: 'Neural network training' },
      { name: 'OpenCV', icon: 'ri-eye-line', desc: 'Real-time face detection' },
      { name: 'Hugging Face', icon: 'ri-emotion-line', desc: 'NLP sentiment analysis' },
    ],
  },
  {
    category: 'Frontend',
    items: [
      { name: 'React 19', icon: 'ri-reactjs-line', desc: 'Modern UI framework' },
      { name: 'TypeScript', icon: 'ri-code-s-slash-line', desc: 'Type-safe development' },
      { name: 'TailwindCSS', icon: 'ri-paint-brush-line', desc: 'Utility-first styling' },
      { name: 'WebRTC', icon: 'ri-video-line', desc: 'Real-time media streaming' },
    ],
  },
  {
    category: 'Backend',
    items: [
      { name: 'Python FastAPI', icon: 'ri-server-line', desc: 'High-performance API' },
      { name: 'WebSocket', icon: 'ri-exchange-line', desc: 'Real-time data pipeline' },
      { name: 'PostgreSQL', icon: 'ri-database-2-line', desc: 'Emotion data storage' },
      { name: 'Redis', icon: 'ri-flashlight-line', desc: 'Session & cache layer' },
    ],
  },
];

const workflowSteps = [
  {
    step: 1,
    title: 'Multimodal Input',
    desc: 'Capture face, voice, and text simultaneously through browser APIs',
    icon: 'ri-camera-lens-line',
    color: '#6C63FF',
  },
  {
    step: 2,
    title: 'Real-time Processing',
    desc: 'Stream data via WebSocket to AI models for instant analysis',
    icon: 'ri-broadcast-line',
    color: '#00D4AA',
  },
  {
    step: 3,
    title: 'Emotion Fusion',
    desc: 'Combine face, voice, and text signals into unified emotion scores',
    icon: 'ri-git-merge-line',
    color: '#EC4899',
  },
  {
    step: 4,
    title: 'Smart Response',
    desc: 'AI assistant adapts responses based on detected emotional state',
    icon: 'ri-message-3-line',
    color: '#F59E0B',
  },
];

const systemStats = [
  { label: 'Emotions Detected', value: '8', suffix: '', desc: 'Core emotional states' },
  { label: 'Analysis Speed', value: '<100', suffix: 'ms', desc: 'Real-time latency' },
  { label: 'Modalities', value: '3', suffix: '', desc: 'Face + Voice + Text' },
  { label: 'Accuracy Rate', value: '94', suffix: '%', desc: 'On validation dataset' },
];

export default function TechStackSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="about" className="py-24 px-6" style={{ background: '#0A0A0F' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'rgba(108,99,255,0.1)', color: '#6C63FF', border: '1px solid rgba(108,99,255,0.2)' }}
            >
              <i className="ri-code-box-line" />
              Built for Scale
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Modern Tech Stack.<br />
              <span style={{ color: '#6C63FF' }}>Powerful Architecture.</span>
            </h2>
          </div>
          <p className="text-gray-400 max-w-md">
            EmpathAI combines cutting-edge AI models with a robust real-time infrastructure to deliver instant, accurate emotion analysis.
          </p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {systemStats.map((stat) => (
            <div
              key={stat.label}
              className="p-5 rounded-xl"
              style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white">{stat.value}</span>
                <span className="text-lg font-semibold" style={{ color: '#00D4AA' }}>{stat.suffix}</span>
              </div>
              <p className="text-white text-sm font-medium mb-1">{stat.label}</p>
              <p className="text-gray-500 text-xs">{stat.desc}</p>
            </div>
          ))}
        </div>

        {/* Tech Stack Tabs */}
        <div className="mb-16">
          <div className="flex flex-wrap gap-2 mb-6">
            {techStack.map((category, index) => (
              <button
                key={category.category}
                onClick={() => setActiveTab(index)}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  background: activeTab === index ? '#6C63FF' : '#13131A',
                  color: activeTab === index ? 'white' : '#9CA3AF',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {category.category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack[activeTab].items.map((tech) => (
              <div
                key={tech.name}
                className="p-5 rounded-xl group hover:scale-[1.02] transition-transform"
                style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'rgba(108,99,255,0.1)' }}
                >
                  <i className={`${tech.icon} text-lg`} style={{ color: '#6C63FF' }} />
                </div>
                <h4 className="text-white font-semibold mb-1">{tech.name}</h4>
                <p className="text-gray-500 text-sm">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Section */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-8" style={{ fontFamily: 'Sora, sans-serif' }}>
            How It Works
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step.step}
                className="relative p-5 rounded-xl"
                style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Connector line */}
                {index < workflowSteps.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                  />
                )}

                {/* Step number */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-4"
                  style={{ background: `${step.color}20`, color: step.color }}
                >
                  {step.step}
                </div>

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${step.color}15` }}
                >
                  <i className={`${step.icon} text-2xl`} style={{ color: step.color }} />
                </div>

                <h4 className="text-white font-semibold mb-2">{step.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Diagram Placeholder */}
        <div className="mt-16 p-6 rounded-2xl" style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">System Architecture</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ background: '#00D4AA' }} />
              Real-time Pipeline
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Input Layer */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(108,99,255,0.05)', border: '1px solid rgba(108,99,255,0.2)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#6C63FF' }}>INPUT LAYER</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-camera-line" style={{ color: '#6C63FF' }} />
                  Face Detection (Webcam)
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-mic-line" style={{ color: '#6C63FF' }} />
                  Voice Analysis (Microphone)
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-keyboard-line" style={{ color: '#6C63FF' }} />
                  Text Input (Chat/Notes)
                </div>
              </div>
            </div>

            {/* Processing Layer */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#00D4AA' }}>PROCESSING LAYER</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-brain-line" style={{ color: '#00D4AA' }} />
                  Emotion Recognition Models
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-git-merge-line" style={{ color: '#00D4AA' }} />
                  Multimodal Fusion Engine
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-shield-check-line" style={{ color: '#00D4AA' }} />
                  Guardian Alert System
                </div>
              </div>
            </div>

            {/* Output Layer */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.2)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#EC4899' }}>OUTPUT LAYER</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-dashboard-line" style={{ color: '#EC4899' }} />
                  Real-time Dashboard
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-chat-smile-line" style={{ color: '#EC4899' }} />
                  Emotion-Aware AI Chat
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <i className="ri-file-chart-line" style={{ color: '#EC4899' }} />
                  Analytics & Reports
                </div>
              </div>
            </div>
          </div>

          {/* Data Flow Arrows */}
          <div className="hidden lg:flex items-center justify-center gap-8 mt-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <i className="ri-arrow-right-line" />
              WebSocket Stream
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <i className="ri-arrow-right-line" />
              JSON API Response
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}