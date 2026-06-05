import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './ComparePage.css';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const rankColor = (rank = '') => {
  const r = rank.toLowerCase();
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  return '#808080';
};

const ComparePage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [u1, setU1] = useState(searchParams.get('u1') || user?.username || '');
  const [u2, setU2] = useState(searchParams.get('u2') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analytics1, setAnalytics1] = useState(null);
  const [analytics2, setAnalytics2] = useState(null);

  const compare = async () => {
    if (!u1.trim() || !u2.trim()) { toast.error('Enter both usernames'); return; }
    setLoading(true);
    try {
      const [cRes, a1Res, a2Res] = await Promise.all([
        axios.get(`/api/users/compare/${u1}/${u2}`, { headers: authHeader() }),
        axios.get(`/api/users/${u1}/analytics`, { headers: authHeader() }),
        axios.get(`/api/users/${u2}/analytics`, { headers: authHeader() }),
      ]);
      setData(cRes.data);
      setAnalytics1(a1Res.data);
      setAnalytics2(a2Res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Comparison failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (u1 && u2) compare(); }, []);

  const radarData = data && analytics1 && analytics2 ? {
    labels: ['Rating', 'Contests', 'Solved', 'Acceptance %', 'Streak'],
    datasets: [
      {
        label: data.user1.username,
        data: [
          Math.min(data.user1.rating / 30, 100),
          Math.min(data.user1.contestsParticipated * 5, 100),
          Math.min((analytics1.cfStats?.accepted || 0) / 10, 100),
          analytics1.cfStats ? Math.round(analytics1.cfStats.accepted / Math.max(analytics1.cfStats.totalSubmissions, 1) * 100) : 0,
          Math.min(data.user1.streak * 3, 100),
        ],
        backgroundColor: 'rgba(88,166,255,0.2)',
        borderColor: 'rgba(88,166,255,1)',
        borderWidth: 2,
        pointBackgroundColor: '#58a6ff',
      },
      {
        label: data.user2.username,
        data: [
          Math.min(data.user2.rating / 30, 100),
          Math.min(data.user2.contestsParticipated * 5, 100),
          Math.min((analytics2.cfStats?.accepted || 0) / 10, 100),
          analytics2.cfStats ? Math.round(analytics2.cfStats.accepted / Math.max(analytics2.cfStats.totalSubmissions, 1) * 100) : 0,
          Math.min(data.user2.streak * 3, 100),
        ],
        backgroundColor: 'rgba(188,140,255,0.2)',
        borderColor: 'rgba(188,140,255,1)',
        borderWidth: 2,
        pointBackgroundColor: '#bc8cff',
      }
    ]
  } : null;

  const Stat = ({ label, v1, v2, higher = 'higher' }) => {
    const winner = higher === 'higher'
      ? (v1 > v2 ? 1 : v2 > v1 ? 2 : 0)
      : (v1 < v2 ? 1 : v2 < v1 ? 2 : 0);
    return (
      <div className="compare-stat-row">
        <div className={`compare-val ${winner === 1 ? 'winner' : ''}`}>{v1}</div>
        <div className="compare-label">{label}</div>
        <div className={`compare-val right ${winner === 2 ? 'winner' : ''}`}>{v2}</div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <h1 className="page-title">⚔️ Head-to-Head Comparison</h1>

      <div className="compare-search card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Username 1" value={u1} onChange={e => setU1(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
          <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 18 }}>VS</span>
          <input placeholder="Username 2" value={u2} onChange={e => setU2(e.target.value)} style={{ flex: 1, minWidth: 150 }} onKeyDown={e => e.key === 'Enter' && compare()} />
          <button className="btn btn-primary btn-lg" onClick={compare} disabled={loading}>
            {loading ? 'Comparing...' : '⚔️ Compare'}
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Profile cards */}
          <div className="compare-profiles">
            <div className="compare-profile-card" style={{ borderColor: 'rgba(88,166,255,0.4)' }}>
              <div className="compare-avatar blue">{data.user1.username[0].toUpperCase()}</div>
              <h2>{data.user1.username}</h2>
              <div style={{ color: rankColor(data.user1.rank), fontWeight: 600 }}>{data.user1.rank}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#58a6ff', marginTop: 8 }}>{data.user1.rating}</div>
            </div>
            <div className="vs-badge">VS</div>
            <div className="compare-profile-card" style={{ borderColor: 'rgba(188,140,255,0.4)' }}>
              <div className="compare-avatar purple">{data.user2.username[0].toUpperCase()}</div>
              <h2>{data.user2.username}</h2>
              <div style={{ color: rankColor(data.user2.rank), fontWeight: 600 }}>{data.user2.rank}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: '#bc8cff', marginTop: 8 }}>{data.user2.rating}</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 20, alignItems: 'start' }}>
            {/* Stats comparison */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 20 }}>📊 Stats Comparison</h3>
              <div className="compare-users-header">
                <span style={{ color: '#58a6ff', fontWeight: 600 }}>{data.user1.username}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>STAT</span>
                <span style={{ color: '#bc8cff', fontWeight: 600, textAlign: 'right' }}>{data.user2.username}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <Stat label="Rating" v1={data.user1.rating} v2={data.user2.rating} />
                <Stat label="Contests" v1={data.user1.contestsParticipated} v2={data.user2.contestsParticipated} />
                <Stat label="CF Accepted" v1={analytics1?.cfStats?.accepted || 0} v2={analytics2?.cfStats?.accepted || 0} />
                <Stat label="Submissions" v1={analytics1?.cfStats?.totalSubmissions || 0} v2={analytics2?.cfStats?.totalSubmissions || 0} />
                <Stat label="Acceptance %" v1={analytics1?.cfStats ? `${Math.round(analytics1.cfStats.accepted/Math.max(analytics1.cfStats.totalSubmissions,1)*100)}%` : '0%'} v2={analytics2?.cfStats ? `${Math.round(analytics2.cfStats.accepted/Math.max(analytics2.cfStats.totalSubmissions,1)*100)}%` : '0%'} />
                <Stat label="Streak" v1={`${data.user1.streak}🔥`} v2={`${data.user2.streak}🔥`} />
              </div>
            </div>

            {/* Radar chart */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>🕸️ Radar Chart</h3>
              {radarData && (
                <Radar data={radarData} options={{
                  scales: { r: { ticks: { display: false }, grid: { color: 'rgba(48,54,61,0.8)' }, pointLabels: { color: '#8b949e', font: { size: 12 } }, angleLines: { color: 'rgba(48,54,61,0.8)' }, suggestedMin: 0, suggestedMax: 100 } },
                  plugins: { legend: { labels: { color: '#8b949e' } } }
                }} />
              )}
            </div>
          </div>

          {/* Tag overlap */}
          {analytics1?.cfStats?.tagStats && analytics2?.cfStats?.tagStats && (
            <div className="card" style={{ marginTop: 20 }}>
              <h3 className="card-title" style={{ marginBottom: 16 }}>🏷️ Tag Comparison</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.keys({...analytics1.cfStats.tagStats, ...analytics2.cfStats.tagStats}).slice(0, 12).map(tag => {
                  const v1 = analytics1.cfStats.tagStats[tag] || 0;
                  const v2 = analytics2.cfStats.tagStats[tag] || 0;
                  const max = Math.max(v1, v2, 1);
                  return (
                    <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#58a6ff' }}>{v1}</span>
                        <div style={{ width: `${v1/max*100}%`, maxWidth: '100%', height: 10, background: '#58a6ff', borderRadius: '4px 0 0 4px', minWidth: v1 ? 2 : 0 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 120, textAlign: 'center' }}>{tag}</span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: `${v2/max*100}%`, maxWidth: '100%', height: 10, background: '#bc8cff', borderRadius: '0 4px 4px 0', minWidth: v2 ? 2 : 0 }} />
                        <span style={{ fontSize: 12, color: '#bc8cff' }}>{v2}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">⚔️</div>
          <h3>Enter two usernames to compare</h3>
          <p>See head-to-head stats, ratings, and tag performance</p>
        </div>
      )}
    </div>
  );
};

export default ComparePage;
