import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import './ContestDetailPage.css';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const formatDate = (d) => new Date(d).toLocaleString();
const formatDuration = (mins) => `${Math.floor(mins/60)}h ${mins%60}m`;

const ContestDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('problems');
  const [inviteFriend, setInviteFriend] = useState('');
  const [searchUsers, setSearchUsers] = useState([]);
  const [timeLeft, setTimeLeft] = useState('');

  const fetchContest = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        axios.get(`/api/contests/${id}`, { headers: authHeader() }),
        axios.get(`/api/contests/${id}/leaderboard`, { headers: authHeader() })
      ]);
      setContest(cRes.data);
      setLeaderboard(lRes.data.leaderboard || []);
    } catch (err) {
      toast.error('Contest not found');
      navigate('/contests');
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetchContest(); }, [fetchContest]);

  useEffect(() => {
    if (!contest) return;
    const socket = io('/', { auth: { token: localStorage.getItem('token') } });
    socket.emit('join-contest', id);
    socket.on('leaderboard-update', ({ leaderboard: lb }) => setLeaderboard(lb));
    return () => { socket.emit('leave-contest', id); socket.disconnect(); };
  }, [id, contest]);

  useEffect(() => {
    if (!contest) return;
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(contest.endTime);
      const start = new Date(contest.startTime);
      if (now < start) {
        const diff = start - now;
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`Starts in ${h}h ${m}m ${s}s`);
      } else if (now < end) {
        const diff = end - now;
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s remaining`);
      } else {
        setTimeLeft('Contest ended');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [contest]);

  const joinContest = async () => {
    try {
      await axios.post(`/api/contests/${id}/join`, {}, { headers: authHeader() });
      toast.success('Joined!');
      fetchContest();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to join'); }
  };

  const searchFriends = async (q) => {
    setInviteFriend(q);
    if (q.length < 2) { setSearchUsers([]); return; }
    const res = await axios.get(`/api/users?q=${q}`, { headers: authHeader() });
    setSearchUsers(res.data);
  };

  const sendInvite = async (friendId) => {
    try {
      await axios.post(`/api/contests/${id}/invite`, { friendId }, { headers: authHeader() });
      toast.success('Invitation sent!');
      setSearchUsers([]); setInviteFriend('');
    } catch (err) { toast.error('Failed to send invitation'); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  if (!contest) return null;

  const isParticipant = contest.participants?.some(p => p.user?._id === user?._id || p.user === user?._id);
  const isCreator = contest.creator?._id === user?._id || contest.creator === user?._id;
  const statusBadge = { upcoming: 'badge-orange', active: 'badge-green', finished: 'badge-red' };

  return (
    <div className="page-container">
      <div className="contest-detail-header">
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>{contest.title}</h1>
            <span className={`badge ${statusBadge[contest.status]}`}>
              {contest.status === 'active' ? '● LIVE' : contest.status}
            </span>
          </div>
          {contest.description && <p style={{ color: 'var(--text-secondary)' }}>{contest.description}</p>}
          <div className="contest-meta-row">
            <span>👤 {contest.creator?.username}</span>
            <span>📋 {contest.problems?.length} problems</span>
            <span>👥 {contest.participants?.length} participants</span>
            <span>⏱️ {formatDuration(contest.duration || 0)}</span>
            <span>🕐 {formatDate(contest.startTime)}</span>
          </div>
        </div>
        <div className="contest-timer-box">
          <div className={`timer-display ${contest.status === 'active' ? 'active' : ''}`}>{timeLeft}</div>
          {contest.isPrivate && (
            <div className="invite-code-box">
              🔑 <strong>{contest.inviteCode}</strong>
              <button className="btn btn-sm btn-secondary" onClick={() => { navigator.clipboard.writeText(contest.inviteCode); toast.success('Copied!'); }}>Copy</button>
            </div>
          )}
          {!isParticipant && contest.status !== 'finished' && (
            <button className="btn btn-primary" onClick={joinContest}>Join Contest</button>
          )}
        </div>
      </div>

      <div className="tab-bar">
        {['problems', 'leaderboard', 'invite'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'problems' ? '📋 Problems' : t === 'leaderboard' ? '📊 Leaderboard' : '📨 Invite'}
          </button>
        ))}
      </div>

      {tab === 'problems' && (
        <div className="problems-list">
          {contest.problems.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📝</div><p>No problems added yet</p></div>
          ) : contest.problems.map((p, i) => (
            <a key={i} href={`https://codeforces.com/problemset/problem/${p.cfContestId}/${p.cfIndex}`}
               target="_blank" rel="noopener noreferrer" className="problem-row">
              <span className="problem-index">{String.fromCharCode(65 + i)}</span>
              <div className="problem-info">
                <span className="problem-name">{p.name}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.tags?.slice(0, 3).map(t => <span key={t} className="badge badge-blue">{t}</span>)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {p.rating && <span className="badge badge-orange">⭐ {p.rating}</span>}
                <span className="badge badge-purple">+{p.points}</span>
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>↗</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="leaderboard-table-wrap">
          {contest.status === 'active' && <div className="live-badge">🔴 Live Leaderboard — Auto-updating</div>}
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                {contest.problems.map((p, i) => <th key={i}>{String.fromCharCode(65 + i)}</th>)}
                <th>Score</th>
                <th>Penalty</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr key={entry._id} className={entry.user?._id === user?._id ? 'my-row' : ''}>
                  <td><span className={`rank-num ${idx < 3 ? `top-${idx+1}` : ''}`}>{idx + 1}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 24, height: 24, fontSize: 11 }}>{entry.username?.[0]?.toUpperCase()}</div>
                      {entry.username}
                    </div>
                  </td>
                  {contest.problems.map((p, i) => {
                    const result = entry.problemResults?.find(r => r.cfContestId === p.cfContestId && r.cfIndex === p.cfIndex);
                    return (
                      <td key={i} className={`problem-cell ${result?.solved ? 'solved' : result?.attempts > 0 ? 'attempted' : ''}`}>
                        {result?.solved ? `✓ +${result.attempts - 1 > 0 ? result.attempts - 1 : ''}` : result?.attempts > 0 ? `-${result.attempts}` : '—'}
                      </td>
                    );
                  })}
                  <td><strong style={{ color: 'var(--accent)' }}>{entry.solvedCount}</strong></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{entry.penalty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leaderboard.length === 0 && <div className="empty-state"><p>No participants yet</p></div>}
        </div>
      )}

      {tab === 'invite' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>📨 Invite Friends</h3>
          <div style={{ position: 'relative' }}>
            <input placeholder="Search by username..." value={inviteFriend} onChange={e => searchFriends(e.target.value)} style={{ width: '100%' }} />
            {searchUsers.length > 0 && (
              <div className="search-dropdown">
                {searchUsers.map(u => (
                  <div key={u._id} className="search-user-item">
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{u.username[0].toUpperCase()}</div>
                    <span style={{ flex: 1 }}>{u.username}</span>
                    <span className="badge badge-blue">{u.rating}</span>
                    <button className="btn btn-sm btn-primary" onClick={() => sendInvite(u._id)}>Invite</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {contest.inviteCode && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>Share invite code</p>
              <div style={{ fontSize: 28, fontFamily: 'var(--font-mono)', letterSpacing: 4, color: 'var(--accent)', fontWeight: 700 }}>{contest.inviteCode}</div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => { navigator.clipboard.writeText(contest.inviteCode); toast.success('Copied!'); }}>📋 Copy Code</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContestDetailPage;
