import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './LeaderboardPage.css';

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
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Global Leaderboard</h1>
      <div className="lb-meta">
        <span>{total} registered users</span>
        {myRank >= 0 && (
          <span className="lb-my-rank">
            Your rank: #{(page - 1) * LIMIT + myRank + 1}
          </span>
        )}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr className="lb-thead-row">
                <th className="lb-th">Rank</th>
                <th className="lb-th">User</th>
                <th className="lb-th">Rating</th>
                <th className="lb-th">Max Rating</th>
                <th className="lb-th">Rank Title</th>
                <th className="lb-th">Contests</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="lb-empty">No users found</td>
                </tr>
              ) : users.map((u, i) => {
                if (!u || !u.username) return null;
                const rank = (page - 1) * LIMIT + i + 1;
                const isMe = u._id === user?._id;
                const initial = (u.username || '?')[0].toUpperCase();
                return (
                  <tr key={u._id || i} className={`lb-row ${isMe ? 'lb-row-me' : ''}`}>
                    <td className="lb-td lb-rank-cell">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : (
                        <span className="lb-rank-num">{rank}</span>
                      )}
                    </td>
                    <td className="lb-td">
                      <Link to={`/profile/${u.username}`} className="lb-user-link">
                        <div className="lb-avatar">{initial}</div>
                        <span className={isMe ? 'lb-username-me' : 'lb-username'}>
                          {u.username}{isMe && ' (you)'}
                        </span>
                      </Link>
                    </td>
                    <td className="lb-td lb-rating" style={{ color: rankColor(u.rank) }}>
                      {u.rating}
                    </td>
                    <td className="lb-td lb-max-rating">{u.maxRating}</td>
                    <td className="lb-td lb-rank-title" style={{ color: rankColor(u.rank) }}>
                      {u.rank || 'Newbie'}
                    </td>
                    <td className="lb-td lb-contests">{u.contestsParticipated || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="lb-pagination">
        <button className="btn btn-secondary" disabled={page <= 1} onClick={() => fetchLB(page - 1)}>← Prev</button>
        <span className="lb-page-info">Page {page} of {totalPages || 1}</span>
        <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => fetchLB(page + 1)}>Next →</button>
      </div>
    </div>
  );
};

export default LeaderboardPage;