import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyData, emotionColors } from '@/mocks/emotions';
import { downloadEmotionPDF, buildFusedFromHistoryRow } from '@/services/pdfReportService';

const intensityColors: Record<string, string> = {
  High: '#00D4AA',
  Medium: '#F59E0B',
  Low: '#3B82F6',
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterEmotion, setFilterEmotion] = useState('All');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const emotions = ['All', ...Array.from(new Set(historyData.map((d) => d.emotion)))];

  const filtered = historyData.filter((d) => {
    if (deletedIds.includes(d.id)) return false;
    const matchSearch = d.emotion.toLowerCase().includes(search.toLowerCase()) || d.date.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterEmotion === 'All' || d.emotion === filterEmotion;
    return matchSearch && matchFilter;
  });

  const handleDelete = (id: string) => {
    setDeletedIds((prev) => [...prev, id]);
  };

  const handleDownload = async (row: typeof historyData[number]) => {
    if (downloadingId) return;
    setDownloadingId(row.id);
    try {
      const fused = buildFusedFromHistoryRow(row);
      await downloadEmotionPDF(fused, false);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>History</h1>
          <p className="text-gray-400 text-sm mt-1">{filtered.length} past analyses</p>
        </div>
        <button
          onClick={() => navigate('/analyze')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer whitespace-nowrap transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)' }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <i className="ri-add-line text-sm"></i>
          </div>
          New Analysis
        </button>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-2xl mb-6 flex flex-col sm:flex-row gap-4"
        style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-gray-500 text-sm"></i>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by emotion or date..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: '#1C1C28', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px' }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(108,99,255,0.5)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>

        {/* Emotion Filter */}
        <div className="flex gap-2 flex-wrap">
          {emotions.map((e) => (
            <button
              key={e}
              onClick={() => setFilterEmotion(e)}
              className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer whitespace-nowrap transition-all"
              style={{
                background: filterEmotion === e ? 'rgba(108,99,255,0.2)' : '#1C1C28',
                border: `1px solid ${filterEmotion === e ? 'rgba(108,99,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                color: filterEmotion === e ? '#8B5CF6' : '#9CA3AF',
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#13131A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-6 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="col-span-2">Date & Time</span>
          <span>Inputs Used</span>
          <span>Emotion</span>
          <span>Confidence</span>
          <span>Actions</span>
        </div>

        {/* Table Rows */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <i className="ri-history-line text-3xl text-gray-600"></i>
            </div>
            <p className="text-gray-500 text-sm">No analyses found</p>
          </div>
        ) : (
          filtered.map((row, idx) => {
            const emotionColor = emotionColors[row.emotion] || '#6C63FF';
            const intensityColor = intensityColors[row.intensity] || '#6C63FF';
            return (
              <div
                key={row.id}
                className="grid grid-cols-6 gap-4 px-6 py-4 items-center transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div className="col-span-2">
                  <p className="text-white text-sm font-medium">{row.date}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{row.time}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {row.inputs.map((inp) => (
                    <span
                      key={inp}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#9CA3AF' }}
                    >
                      {inp}
                    </span>
                  ))}
                </div>
                <div>
                  <span
                    className="text-sm font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: `${emotionColor}15`, color: emotionColor }}
                  >
                    {row.emotion}
                  </span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{row.confidence}%</p>
                  <span
                    className="text-xs"
                    style={{ color: intensityColor }}
                  >
                    {row.intensity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/results')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-white/10"
                    title="View Report"
                    style={{ color: '#6C63FF' }}
                  >
                    <i className="ri-eye-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => handleDownload(row)}
                    disabled={downloadingId === row.id}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-white/10 disabled:opacity-50"
                    title="Download PDF"
                    style={{ color: '#00D4AA' }}
                  >
                    {downloadingId === row.id ? (
                      <i className="ri-loader-4-line text-sm animate-spin"></i>
                    ) : (
                      <i className="ri-download-line text-sm"></i>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-red-500/10"
                    title="Delete"
                    style={{ color: '#EF4444' }}
                  >
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
