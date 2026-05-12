import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const emotionColors: Record<string, string> = {
  Happy: '#00D4AA', Sad: '#6C63FF', Anxious: '#F59E0B', Angry: '#EF4444',
  Neutral: '#94A3B8', Excited: '#EC4899', Calm: '#3B82F6', Fearful: '#8B5CF6',
  Disgusted: '#10B981', Surprised: '#F97316',
};
import { downloadEmotionPDF, buildFusedFromHistoryRow } from '@/services/pdfReportService';

const BACKEND = 'http://localhost:5000';

const intensityColors: Record<string, string> = {
  High: '#00D4AA',
  Medium: '#F59E0B',
  Low: '#3B82F6',
};

interface HistoryRow {
  id: string;
  date: string;
  time: string;
  inputs: string[];
  emotion: string;
  confidence: number;
  intensity: string;
  raw: Record<string, unknown>;
}

function toPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const scaled = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, scaled));
}

function intensityFromValue(intensity: number): string {
  if (intensity < 33) return 'Low';
  if (intensity < 67) return 'Medium';
  return 'High';
}

function parseRecord(r: Record<string, unknown>): HistoryRow {
  const createdAt = new Date((r.created_at as string) || Date.now());
  const date = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const modalities = (r.modalities as Record<string, unknown>) || {};
  const inputs = Object.keys(modalities).filter((k) => modalities[k]).map((k) => k.charAt(0).toUpperCase() + k.slice(1));

  const confidencePercent = toPercent(r.confidence);
  const intensityNumeric = toPercent(r.intensity);
  const intensityLabel =
    (r.intensity_label as string) ||
    (r.intensityLabel as string) ||
    (Number.isFinite(Number(r.intensity)) ? intensityFromValue(intensityNumeric) : intensityFromValue(confidencePercent));

  return {
    id: r._id as string,
    date,
    time,
    inputs: inputs.length ? inputs : ['Text'],
    emotion: ((r.emotion as string) || 'neutral').charAt(0).toUpperCase() + ((r.emotion as string) || 'neutral').slice(1),
    confidence: Math.round(confidencePercent),
    intensity: intensityLabel,
    raw: r,
  };
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEmotion, setFilterEmotion] = useState('All');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${BACKEND}/api/emotion/history?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.history)) {
            setRows(data.history.map(parseRecord));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      // No auth — read from localStorage
      try {
        const local: unknown[] = JSON.parse(localStorage.getItem('empathAI_history') || '[]');
        const mapped = local.map((item, i) => {
          const r = item as Record<string, unknown>;
          const savedAt = new Date((r.savedAt as number) || (r.timestamp as string) || Date.now());
          const date = savedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const time = savedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          const modalities = (r.modalities as Array<Record<string, unknown>>) || [];
          const inputs = modalities.map((m) => {
            const mod = String(m.modality || '');
            return mod.charAt(0).toUpperCase() + mod.slice(1);
          });
          const confidence = toPercent(r.confidence);
          const intensity =
            (r.intensityLabel as string) ||
            (Number.isFinite(Number(r.intensity)) ? intensityFromValue(toPercent(r.intensity)) : intensityFromValue(confidence));
          const emotion = String(r.emotion || 'neutral');
          return {
            id: String(r._id || r.id || i),
            date,
            time,
            inputs: inputs.length ? inputs : ['Text'],
            emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
            confidence: Math.round(confidence),
            intensity,
            raw: r,
          } as HistoryRow;
        });
        setRows(mapped);
      } catch { /* ignore parse errors */ }
      setLoading(false);
    }
  }, []);

  const emotions = ['All', ...Array.from(new Set(rows.map((d) => d.emotion)))];

  const filtered = rows.filter((d) => {
    const matchSearch = d.emotion.toLowerCase().includes(search.toLowerCase()) || d.date.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterEmotion === 'All' || d.emotion === filterEmotion;
    return matchSearch && matchFilter;
  });

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('token');
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (!token) {
      // Remove from localStorage
      try {
        const local: unknown[] = JSON.parse(localStorage.getItem('empathAI_history') || '[]');
        const updated = local.filter((_, i) => String(i) !== id && ((_ as Record<string,unknown>)._id || (_ as Record<string,unknown>).id) !== id);
        localStorage.setItem('empathAI_history', JSON.stringify(updated));
      } catch { /* ignore */ }
      return;
    }
    try {
      await fetch(`${BACKEND}/api/emotion/record/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDownload = async (row: HistoryRow) => {
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

  const handleView = (row: HistoryRow) => {
    navigate('/results', { state: { fused: buildFusedFromHistoryRow(row) } });
  };

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: '#07070E' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>History</h1>
          <p className="text-gray-400 text-sm mt-1">{loading ? 'Loading…' : `${filtered.length} past analyses`}</p>
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

        {loading ? (
          <div className="py-16 text-center">
            <i className="ri-loader-4-line text-3xl text-gray-600 animate-spin"></i>
            <p className="text-gray-500 text-sm mt-3">Loading history…</p>
          </div>
        ) : filtered.length === 0 ? (
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
                  <span className="text-xs" style={{ color: intensityColor }}>{row.intensity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(row)}
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


