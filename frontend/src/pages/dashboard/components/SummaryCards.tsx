interface SummaryCardsProps {
  sessionCount?: number;
  alertCount?: number;
}

export default function SummaryCards({ sessionCount = 0, alertCount = 0 }: SummaryCardsProps) {
  const stats = [
    {
      label: 'Live Detections',
      value: sessionCount > 0 ? String(sessionCount) : '24',
      change: '+3 today',
      icon: 'ri-pulse-line',
      color: '#00D4AA',
      bg: 'rgba(0,212,170,0.08)',
      border: 'rgba(0,212,170,0.15)',
      trend: 'up',
    },
    {
      label: 'Avg Confidence',
      value: sessionCount > 0 ? '84%' : '87%',
      change: '+2% vs yesterday',
      icon: 'ri-shield-check-line',
      color: '#6C63FF',
      bg: 'rgba(108,99,255,0.08)',
      border: 'rgba(108,99,255,0.15)',
      trend: 'up',
    },
    {
      label: 'Sessions Today',
      value: '12',
      change: '3 multimodal',
      icon: 'ri-time-line',
      color: '#EC4899',
      bg: 'rgba(236,72,153,0.08)',
      border: 'rgba(236,72,153,0.15)',
      trend: 'neutral',
    },
    {
      label: 'Guardian Alerts',
      value: String(alertCount || 0),
      change: alertCount > 0 ? 'Needs attention' : 'All clear',
      icon: 'ri-alarm-warning-line',
      color: alertCount > 0 ? '#EF4444' : '#F59E0B',
      bg: alertCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
      border: alertCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
      trend: alertCount > 0 ? 'down' : 'neutral',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-5 rounded-2xl relative overflow-hidden"
          style={{ background: '#13131A', border: `1px solid rgba(255,255,255,0.06)` }}
        >
          {/* Subtle top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: stat.color, opacity: 0.6 }} />

          <div className="flex items-start justify-between mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <i className={`${stat.icon} text-base`} style={{ color: stat.color }}></i>
              </div>
            </div>
            <div
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{
                background: stat.trend === 'up' ? 'rgba(0,212,170,0.1)' : stat.trend === 'down' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                color: stat.trend === 'up' ? '#00D4AA' : stat.trend === 'down' ? '#EF4444' : '#6B7280',
              }}
            >
              <i className={`${stat.trend === 'up' ? 'ri-arrow-up-line' : stat.trend === 'down' ? 'ri-arrow-down-line' : 'ri-subtract-line'} text-xs`}></i>
            </div>
          </div>

          <p className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
            {stat.value}
          </p>
          <p className="text-gray-400 text-xs font-medium mb-1">{stat.label}</p>
          <p className="text-xs" style={{ color: stat.color, opacity: 0.8 }}>{stat.change}</p>
        </div>
      ))}
    </div>
  );
}
