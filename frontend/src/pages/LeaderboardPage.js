import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const rankColor = (rank) => {
  const r = (rank || '').toLowerCase();
  if (r.includes('legendary')) return '#ff0000';
  if (r.includes('international grand')) return '#ff0000';
  if (r.includes('grandmaster')) return '#ff0000';
  if (r.includes('international master')) return '#ff8c00';
  if (r.includes('master')) return '#ff8c00';
  if (r.includes('candidate')) return '#aa00aa';
  if (r.includes('expert')) return '#0000ff';
  if (r.includes('specialist')) return '#03a89e';
  if (r.includes('pupil')) return '#008000';
  return '#808080';
};

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const fetchLB = async (p = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/leaderboard/global?page=${p}&limit=${LIMIT}`, { headers: authHeader() });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch (err) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLB(); }, []);

  const myRank = users.findIndex(u => u._id === user?._id);

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Global Leaderboard</h1>
      <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
        {total} registered users
        {myRank >= 0 && <span style={{ marginLeft: 16, color: 'var(--accent)' }}>Your rank: #{(page - 1) * LIMIT + myRank + 1}</span>}
      </div>
      {loading ? <div className="loading-spinner"><div className="spinner"/></div> : (
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                {['Rank', 'User', 'Rating', 'Max Rating', 'Rank Title', 'Contests'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rank = (page - 1) * LIMIT + i + 1;
                const isMe = u._id === user?._id;
                return (
                  <tr key={u._id} style={{ background: isMe ? 'var(--accent-subtle)' : '', borderBottom: '1px solid var(--border-muted)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 16 }}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : <span style={{ color: 'var(--text-secondary)' }}>{rank}</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link to={`/profile/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#000' }}>{u.username[0].toUpperCase()}</div>
                        <span style={{ fontWeight: isMe ? 600 : 400, color: 'var(--text-primary)' }}>{u.username}{isMe && ' (you)'}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: rankColor(u.rank) }}>{u.rating}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{u.maxRating}</td>
                    <td style={{ padding: '12px 16px', color: rankColor(u.rank), fontWeight: 500 }}>{u.rank || 'Newbie'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.contestsParticipated || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
        <button className="btn btn-secondary" disabled={page <= 1} onClick={() => fetchLB(page - 1)}>← Prev</button>
        <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: 14 }}>Page {page} of {Math.ceil(total / LIMIT)}</span>
        <button className="btn btn-secondary" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => fetchLB(page + 1)}>Next →</button>
      </div>
    </div>
  );
};

export default LeaderboardPage;
