import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const rankColor = (rank = '') => {
  const r = rank.toLowerCase();
  if (r.includes('legendary')) return '#ff0000';
  if (r.includes('grandmaster')) return '#ff0000';
  if (r.includes('international master')) return '#ff8c00';
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('candidate')) return '#aa00aa';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  return '#808080';
};

const ProfilePage = () => {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [friendAction, setFriendAction] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pRes, aRes] = await Promise.all([
          axios.get(`/api/users/${username}`, { headers: authHeader() }),
          axios.get(`/api/users/${username}/analytics`, { headers: authHeader() })
        ]);
        setProfile(pRes.data);
        setAnalytics(aRes.data);
      } catch {
        toast.error('User not found');
        navigate('/leaderboard');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [username]);

  const isSelf = me?.username === username;
  const isFriend = profile?.friends?.some(f => f._id === me?._id || f === me?._id);
  const hasPendingRequest = profile?.friendRequests?.includes(me?._id);

  const sendFriendRequest = async () => {
    try {
      await axios.post(`/api/users/friends/request/${profile._id}`, {}, { headers: authHeader() });
      toast.success('Friend request sent!');
      setFriendAction('sent');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const tagData = analytics?.cfStats?.tagStats
    ? Object.entries(analytics.cfStats.tagStats).sort((a, b) => b[1] - a[1]).slice(0, 10)
    : [];

  const chartData = tagData.length ? {
    labels: tagData.map(([t]) => t),
    datasets: [{
      label: 'Problems Solved',
      data: tagData.map(([, v]) => v),
      backgroundColor: 'rgba(88,166,255,0.6)',
      borderColor: 'rgba(88,166,255,1)',
      borderWidth: 1,
      borderRadius: 4,
    }]
  } : null;

  const doughnutData = tagData.slice(0, 6).length ? {
    labels: tagData.slice(0, 6).map(([t]) => t),
    datasets: [{
      data: tagData.slice(0, 6).map(([, v]) => v),
      backgroundColor: ['#58a6ff','#bc8cff','#3fb950','#ffa657','#f85149','#d29922'],
      borderWidth: 0,
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} solved` } } },
    scales: {
      x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: '#21262d' } },
      y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } }
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!profile) return null;

  // Streak heatmap (last 52 weeks)
  const today = new Date();
  const weeks = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const solvedSet = new Set(profile.solvedDates || []);
  let week = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0];
    week.push({ date: ds, solved: solvedSet.has(ds) });
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push(week);

  return (
    <div className="page-container">
      {/* Hero */}
      <div className="profile-hero card">
        <div className="profile-avatar-large">{profile.username[0].toUpperCase()}</div>
        <div className="profile-hero-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>{profile.username}</h1>
            <span style={{ fontWeight: 700, fontSize: 18, color: rankColor(profile.rank) }}>{profile.rank || 'Newbie'}</span>
          </div>
          {profile.codeforcesHandle && (
            <a href={`https://codeforces.com/profile/${profile.codeforcesHandle}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 14 }}>
              🔗 CF: {profile.codeforcesHandle}
            </a>
          )}
          {profile.bio && <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{profile.bio}</p>}
          <div className="profile-stats-row">
            <div className="profile-stat">
              <strong style={{ color: rankColor(profile.rank), fontSize: 22 }}>{profile.rating}</strong>
              <span>Rating</span>
            </div>
            <div className="profile-stat">
              <strong style={{ fontSize: 22 }}>{profile.maxRating}</strong>
              <span>Max Rating</span>
            </div>
            <div className="profile-stat">
              <strong style={{ fontSize: 22 }}>{profile.contestsParticipated || 0}</strong>
              <span>Contests</span>
            </div>
            <div className="profile-stat">
              <strong style={{ fontSize: 22 }}>{profile.problemsSolved || analytics?.cfStats?.accepted || 0}</strong>
              <span>Solved</span>
            </div>
            <div className="profile-stat">
              <strong style={{ fontSize: 22 }}>🔥 {profile.streakCurrent || 0}</strong>
              <span>Streak</span>
            </div>
            <div className="profile-stat">
              <strong style={{ fontSize: 22 }}>{profile.friends?.length || 0}</strong>
              <span>Friends</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column', alignItems: 'flex-end' }}>
          {isSelf ? (
            <Link to="/analytics" className="btn btn-primary">📈 My Analytics</Link>
          ) : (
            <>
              {!isFriend && !hasPendingRequest && friendAction !== 'sent' && (
                <button className="btn btn-primary" onClick={sendFriendRequest}>➕ Add Friend</button>
              )}
              {(isFriend) && <span className="badge badge-green">✓ Friends</span>}
              {(hasPendingRequest || friendAction === 'sent') && <span className="badge badge-orange">⏳ Pending</span>}
              <Link to={`/compare?u1=${me?.username}&u2=${username}`} className="btn btn-secondary">⚔️ Compare</Link>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginTop: 24 }}>
        {['overview', 'tags', 'friends', 'contests'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {/* Streak Heatmap */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3 className="card-title">🔥 Activity Heatmap</h3>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Last 365 days</span>
            </div>
            <div className="heatmap-scroll">
              <div className="heatmap">
                {weeks.map((week, wi) => (
                  <div key={wi} className="heatmap-week">
                    {week.map((day, di) => (
                      <div key={di} className={`heatmap-cell ${day.solved ? 'solved' : ''}`} title={day.date} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CF Stats summary */}
          {analytics?.cfStats && (
            <div className="grid-3">
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{analytics.cfStats.accepted}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Problems Accepted</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--purple)' }}>{analytics.cfStats.totalSubmissions}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Total Submissions</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>
                  {analytics.cfStats.totalSubmissions > 0 ? Math.round(analytics.cfStats.accepted / analytics.cfStats.totalSubmissions * 100) : 0}%
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Acceptance Rate</div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'tags' && (
        <div className="grid-2">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Top Tags (Bar)</h3>
            {chartData ? (
              <Bar data={chartData} options={chartOptions} />
            ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No data — link a CF handle to see stats</p>}
          </div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Top Tags (Distribution)</h3>
            {doughnutData ? (
              <div style={{ maxWidth: 280, margin: '0 auto' }}>
                <Doughnut data={doughnutData} options={{ plugins: { legend: { labels: { color: '#8b949e' } } }, cutout: '60%' }} />
              </div>
            ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No data available</p>}
          </div>
          <div className="card" style={{ gridColumn: '1/-1' }}>
            <h3 className="card-title" style={{ marginBottom: 12 }}>All Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tagData.map(([tag, count]) => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-tertiary)', borderRadius: 99, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13 }}>{tag}</span>
                  <span style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', borderRadius: 99, padding: '1px 7px', fontSize: 12, fontWeight: 600 }}>{count}</span>
                </div>
              ))}
              {tagData.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No tag data available</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'friends' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Friends ({profile.friends?.length || 0})</h3>
          {profile.friends?.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">👥</div><p>No friends yet</p></div>
          ) : (
            <div className="friends-grid">
              {profile.friends.map(f => (
                <Link key={f._id || f} to={`/profile/${f.username || f}`} className="friend-card">
                  <div className="profile-avatar-small">{(f.username || '?')[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{f.username || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: rankColor(f.rank) }}>{f.rank || 'Newbie'}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: rankColor(f.rank), fontWeight: 700 }}>{f.rating}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'contests' && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Recent Activity</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {username} has participated in <strong style={{ color: 'var(--accent)' }}>{profile.contestsParticipated || 0}</strong> contests on this platform.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link to={`/compare?u1=${me?.username}&u2=${username}`} className="btn btn-secondary">⚔️ Compare with {username}</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
