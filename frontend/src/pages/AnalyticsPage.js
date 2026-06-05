import React, { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, PointElement, LineElement, Filler
} from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './AnalyticsPage.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, PointElement, LineElement, Filler);

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const chartDefaults = {
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: 'rgba(48,54,61,0.5)' } },
    y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,0.5)' } }
  },
  responsive: true,
  maintainAspectRatio: true,
};

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cfHandle, setCfHandle] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user?.username) {
      axios.get(`/api/users/${user.username}/analytics`, { headers: authHeader() })
        .then(r => setAnalytics(r.data))
        .catch(() => toast.error('Failed to load analytics'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const syncCF = async () => {
    if (!cfHandle.trim()) return;
    setSyncing(true);
    try {
      await axios.put('/api/auth/sync-cf', { codeforcesHandle: cfHandle }, { headers: authHeader() });
      toast.success('CF handle synced!');
      window.location.reload();
    } catch (err) { toast.error(err.response?.data?.message || 'Sync failed'); }
    finally { setSyncing(false); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const tagData = analytics?.cfStats?.tagStats
    ? Object.entries(analytics.cfStats.tagStats).sort((a, b) => b[1] - a[1])
    : [];

  const top10Tags = tagData.slice(0, 10);
  const weakTags = tagData.slice(-5).reverse();

  const barData = top10Tags.length ? {
    labels: top10Tags.map(([t]) => t),
    datasets: [{
      label: 'Solved',
      data: top10Tags.map(([, v]) => v),
      backgroundColor: top10Tags.map((_, i) => `hsla(${210 + i * 15}, 80%, 65%, 0.8)`),
      borderRadius: 6,
      borderWidth: 0,
    }]
  } : null;

  const doughnutData = top10Tags.slice(0, 8).length ? {
    labels: top10Tags.slice(0, 8).map(([t]) => t),
    datasets: [{
      data: top10Tags.slice(0, 8).map(([, v]) => v),
      backgroundColor: ['#58a6ff','#bc8cff','#3fb950','#ffa657','#f85149','#d29922','#79c0ff','#56d364'],
      borderWidth: 0,
      hoverOffset: 8,
    }]
  } : null;

  const ratingDist = analytics?.cfStats?.tagStats
    ? (() => {
      const ranges = [
        { label: '800-1000', min: 800, max: 1000 }, { label: '1000-1200', min: 1000, max: 1200 },
        { label: '1200-1400', min: 1200, max: 1400 }, { label: '1400-1600', min: 1400, max: 1600 },
        { label: '1600-1800', min: 1600, max: 1800 }, { label: '1800-2000', min: 1800, max: 2000 },
        { label: '2000+', min: 2000, max: 9999 },
      ];
      return ranges;
    })()
    : [];

  const acceptanceRate = analytics?.cfStats
    ? Math.round(analytics.cfStats.accepted / Math.max(analytics.cfStats.totalSubmissions, 1) * 100)
    : 0;

  return (
    <div className="page-container">
      <h1 className="page-title">📈 My Analytics</h1>

      {!user?.codeforcesHandle && (
        <div className="cf-sync-banner card" style={{ marginBottom: 24, borderColor: 'var(--warning)' }}>
          <div>
            <h3 style={{ color: 'var(--warning)' }}>⚠️ Link your Codeforces handle</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Connect your CF account to unlock detailed analytics</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="CF Handle (e.g. tourist)" value={cfHandle} onChange={e => setCfHandle(e.target.value)} style={{ minWidth: 200 }} />
            <button className="btn btn-primary" onClick={syncCF} disabled={syncing}>{syncing ? 'Syncing...' : '🔗 Connect'}</button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: '🏆', label: 'Rating', value: analytics?.user?.rating || 1200, color: 'var(--accent)' },
          { icon: '✅', label: 'CF Accepted', value: analytics?.cfStats?.accepted || 0, color: 'var(--success)' },
          { icon: '📤', label: 'Total Submissions', value: analytics?.cfStats?.totalSubmissions || 0, color: 'var(--purple)' },
          { icon: '🎯', label: 'Acceptance Rate', value: `${acceptanceRate}%`, color: 'var(--orange)' },
        ].map(s => (
          <div key={s.label} className="card analytics-stat">
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Streak info */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>🔥</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--orange)' }}>{analytics?.user?.streakCurrent || 0}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Current Streak</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Max Streak</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{analytics?.user?.streakMax || 0} days</div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Contests Participated</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{analytics?.user?.contestsParticipated || 0}</div>
            </div>
          </div>
        </div>

        {/* Weak topics */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 12 }}>🎯 Focus Areas (Weak Topics)</h3>
          {weakTags.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Link CF handle to see recommendations</p>
          ) : weakTags.map(([tag, count]) => (
            <div key={tag} className="weak-topic-row">
              <span style={{ flex: 1, fontSize: 14 }}>{tag}</span>
              <div className="weak-bar-wrap">
                <div className="weak-bar" style={{ width: `${Math.min(count * 5, 100)}%` }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 30, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
          {weakTags.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>💡 Practice these topics on Codeforces to improve your rating</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Top 10 Solved Tags</h3>
          {barData ? <Bar data={barData} options={chartDefaults} /> : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <p>Connect CF to see tag analytics</p>
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Tag Distribution</h3>
          {doughnutData ? (
            <div style={{ maxWidth: 300, margin: '0 auto' }}>
              <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#8b949e', padding: 12, font: { size: 11 } } } }, cutout: '55%' }} />
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}><p>No data yet</p></div>
          )}
        </div>
      </div>

      {/* Full tag breakdown */}
      {tagData.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Complete Tag Breakdown</h3>
          <div className="tag-breakdown-grid">
            {tagData.map(([tag, count], i) => {
              const max = tagData[0][1];
              const pct = Math.round(count / max * 100);
              return (
                <div key={tag} className="tag-breakdown-row">
                  <span style={{ width: 24, color: 'var(--text-muted)', fontSize: 12 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{tag}</span>
                  <div style={{ flex: 2, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ minWidth: 36, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
