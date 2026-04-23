import { analyticsTimeline, emotionDistribution } from '@/mocks/emotions';

const maxVal = 100;

export default function AnalyticsPage() {
  const dominantEmotion = emotionDistribution[0];

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Emotion patterns and session insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Dominant Emotion', value: dominantEmotion.emotion, color: dominantEmotion.color, icon: 'ri-emotion-happy-line' },
          { label: 'Total Sessions', value: '247', color: '#6C63FF', icon: 'ri-bar-chart-line' },
          { label: 'Avg Session Length', value: '8.4 min', color: '#00D4AA', icon: 'ri-time-line' },
        ].map((card) => (
          <div
            key={card.label}
            className="p-5 rounded-2xl flex items-center gap-4"
            style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${card.color}18` }}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className={`${card.icon} text-xl`} style={{ color: card.color }}></i>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif', color: card.color }}>
                {card.value}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Chart */}
      <div
        className="p-6 rounded-2xl mb-6"
        style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-white text-sm font-semibold">Emotion Timeline — Today</p>
          <div className="flex gap-4 flex-wrap">
            {[
              { label: 'Happy', color: '#00D4AA' },
              { label: 'Anxious', color: '#F59E0B' },
              { label: 'Sad', color: '#6C63FF' },
              { label: 'Calm', color: '#3B82F6' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }}></div>
                <span className="text-gray-400 text-xs">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="relative" style={{ height: '200px' }}>
          <div className="absolute inset-0 flex items-end gap-2">
            {analyticsTimeline.map((point, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end gap-0.5 h-full relative group">
                {/* Tooltip */}
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                  style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', whiteSpace: 'nowrap' }}
                >
                  <p className="text-white text-xs font-semibold mb-1">{point.time}</p>
                  {[
                    { label: 'Happy', val: point.happy, color: '#00D4AA' },
                    { label: 'Anxious', val: point.anxious, color: '#F59E0B' },
                    { label: 'Sad', val: point.sad, color: '#6C63FF' },
                    { label: 'Calm', val: point.calm, color: '#3B82F6' },
                  ].map((e) => (
                    <p key={e.label} className="text-xs" style={{ color: e.color }}>{e.label}: {e.val}%</p>
                  ))}
                </div>

                {/* Stacked bars */}
                <div className="w-full rounded-t-sm" style={{ height: `${(point.calm / maxVal) * 180}px`, background: '#3B82F6', opacity: 0.8 }}></div>
                <div className="w-full" style={{ height: `${(point.sad / maxVal) * 180}px`, background: '#6C63FF', opacity: 0.8 }}></div>
                <div className="w-full" style={{ height: `${(point.anxious / maxVal) * 180}px`, background: '#F59E0B', opacity: 0.8 }}></div>
                <div className="w-full rounded-b-sm" style={{ height: `${(point.happy / maxVal) * 180}px`, background: '#00D4AA', opacity: 0.8 }}></div>
              </div>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none">
            {[100, 75, 50, 25, 0].map((v) => (
              <span key={v} className="text-gray-600 text-xs">{v}%</span>
            ))}
          </div>
        </div>

        {/* X-axis */}
        <div className="flex gap-2 mt-2 pl-6">
          {analyticsTimeline.map((p) => (
            <div key={p.time} className="flex-1 text-center">
              <span className="text-gray-600 text-xs">{p.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Distribution */}
        <div
          className="p-6 rounded-2xl"
          style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-white text-sm font-semibold mb-6">Emotion Distribution</p>

          {/* Donut chart (CSS-based) */}
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {(() => {
                  let offset = 0;
                  const circumference = 2 * Math.PI * 45;
                  return emotionDistribution.map((e) => {
                    const dash = (e.percentage / 100) * circumference;
                    const el = (
                      <circle
                        key={e.emotion}
                        cx="60" cy="60" r="45"
                        fill="none"
                        stroke={e.color}
                        strokeWidth="18"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                      />
                    );
                    offset += dash;
                    return el;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>247</span>
                <span className="text-gray-500 text-xs">sessions</span>
              </div>
            </div>

            <div className="flex-1 space-y-2.5">
              {emotionDistribution.map((e) => (
                <div key={e.emotion} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }}></div>
                  <span className="text-gray-300 text-xs flex-1">{e.emotion}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: `${e.percentage}%`, background: e.color }}></div>
                  </div>
                  <span className="text-gray-400 text-xs w-8 text-right">{e.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session Summary */}
        <div
          className="p-6 rounded-2xl"
          style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-white text-sm font-semibold mb-5">Session Summary</p>

          <div
            className="p-4 rounded-xl mb-5"
            style={{ background: `${dominantEmotion.color}10`, border: `1px solid ${dominantEmotion.color}25` }}
          >
            <p className="text-gray-400 text-xs mb-1">Dominant Emotion (All Time)</p>
            <p className="text-2xl font-bold" style={{ color: dominantEmotion.color, fontFamily: 'Sora, sans-serif' }}>
              {dominantEmotion.emotion}
            </p>
            <p className="text-gray-400 text-xs mt-1">{dominantEmotion.percentage}% of all sessions</p>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Most active time', value: '2–4 PM', icon: 'ri-time-line', color: '#6C63FF' },
              { label: 'Longest positive streak', value: '5 days', icon: 'ri-calendar-check-line', color: '#00D4AA' },
              { label: 'Guardian alerts triggered', value: '3 total', icon: 'ri-alarm-warning-line', color: '#F59E0B' },
              { label: 'Avg confidence score', value: '84%', icon: 'ri-percent-line', color: '#EC4899' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <i className={`${item.icon} text-xs`} style={{ color: item.color }}></i>
                  </div>
                  <span className="text-gray-400 text-sm">{item.label}</span>
                </div>
                <span className="text-white text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
