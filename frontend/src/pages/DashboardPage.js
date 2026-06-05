import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './DashboardPage.css';

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{ borderTopColor: color }}>
    <div className="stat-icon" style={{ color }}>{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('/api/contests?limit=5', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setContests(r.data.contests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcomingContests = contests.filter(c => c.status === 'upcoming').slice(0, 3);
  const activeContests = contests.filter(c => c.status === 'active').slice(0, 3);

  return (
    <div className="page-container">
      <div className="dashboard-welcome">
        <div>
          <h1>Welcome back, <span style={{ color: 'var(--accent)' }}>{user?.username}</span> 👋</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {user?.rank} · Rating: <strong style={{ color: 'var(--accent)' }}>{user?.rating}</strong>
          </p>
        </div>
        <Link to="/contests/create" className="btn btn-primary btn-lg">+ New Contest</Link>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <StatCard icon="🏆" label="Rating" value={user?.rating || 1200} color="var(--accent)" />
        <StatCard icon="🎯" label="Contests" value={user?.contestsParticipated || 0} color="var(--success)" />
        <StatCard icon="💡" label="Solved" value={user?.problemsSolved || 0} color="var(--purple)" />
        <StatCard icon="🔥" label="Streak" value={`${user?.streakCurrent || 0} days`} color="var(--orange)" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🔴 Active Contests</h3>
            <Link to="/contests?status=active" className="btn btn-sm btn-secondary">View all</Link>
          </div>
          {loading ? <div className="loading-spinner"><div className="spinner"/></div> :
           activeContests.length === 0 ? <p className="empty-hint">No active contests right now</p> :
           activeContests.map(c => <ContestItem key={c._id} contest={c} />)}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⏳ Upcoming Contests</h3>
            <Link to="/contests?status=upcoming" className="btn btn-sm btn-secondary">View all</Link>
          </div>
          {loading ? <div className="loading-spinner"><div className="spinner"/></div> :
           upcomingContests.length === 0 ? <p className="empty-hint">No upcoming contests</p> :
           upcomingContests.map(c => <ContestItem key={c._id} contest={c} />)}
        </div>
      </div>

      <div className="quick-links">
        <h3 style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</h3>
        <div className="grid-4">
          {[
            { to: '/contests', icon: '🏆', label: 'Browse Contests', desc: 'Find and join contests' },
            { to: '/problems', icon: '💡', label: 'Practice Problems', desc: 'Browse CF problems' },
            { to: '/leaderboard', icon: '📊', label: 'Leaderboard', desc: 'See global rankings' },
            { to: '/compare', icon: '⚔️', label: 'Compare', desc: 'Head-to-head stats' },
          ].map(item => (
            <Link key={item.to} to={item.to} className="quick-card">
              <span className="quick-icon">{item.icon}</span>
              <div>
                <div className="quick-label">{item.label}</div>
                <div className="quick-desc">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const ContestItem = ({ contest }) => (
  <Link to={`/contests/${contest._id}`} className="contest-item">
    <div className="contest-item-info">
      <span className="contest-item-name">{contest.title}</span>
      <span className="badge badge-blue">{contest.problems?.length || 0} problems</span>
    </div>
    <div className="contest-item-meta">
      <span>by {contest.creator?.username}</span>
      <span className={`badge ${contest.status === 'active' ? 'badge-green' : 'badge-orange'}`}>
        {contest.status === 'active' ? '● LIVE' : '⏳ Soon'}
      </span>
    </div>
  </Link>
);

export default DashboardPage;
