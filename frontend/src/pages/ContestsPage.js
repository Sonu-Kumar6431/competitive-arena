import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ContestsPage.css';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const formatDate = (d) => new Date(d).toLocaleString();

const ContestsPage = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [inviteCode, setInviteCode] = useState('');
  const navigate = useNavigate();

  const fetchContests = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await axios.get(`/api/contests${params}&limit=50`, { headers: authHeader() });
      setContests(res.data.contests || []);
    } catch (err) {
      toast.error('Failed to fetch contests');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchContests(); }, [filter]);

  const joinByCode = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      const res = await axios.post(`/api/contests/join/${inviteCode.trim()}`, {}, { headers: authHeader() });
      toast.success('Joined contest!');
      navigate(`/contests/${res.data.contestId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    }
  };

  const statusColor = { upcoming: 'badge-orange', active: 'badge-green', finished: 'badge-red' };

  return (
    <div className="page-container">
      <div className="contests-header">
        <h1 className="page-title">🏆 Contests</h1>
        <div className="contests-actions">
          <form onSubmit={joinByCode} className="join-form">
            <input placeholder="Enter invite code..." value={inviteCode} onChange={e => setInviteCode(e.target.value)} style={{ minWidth: 200 }} />
            <button className="btn btn-secondary" type="submit">Join</button>
          </form>
          <Link to="/contests/create" className="btn btn-primary">+ Create Contest</Link>
        </div>
      </div>

      <div className="filter-tabs">
        {['all', 'upcoming', 'active', 'finished'].map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner"/></div> :
       contests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏁</div>
          <h3>No contests found</h3>
          <p>Create your first contest or join one with an invite code</p>
        </div>
       ) : (
        <div className="contests-grid">
          {contests.map(c => (
            <Link key={c._id} to={`/contests/${c._id}`} className="contest-card">
              <div className="contest-card-top">
                <h3 className="contest-card-title">{c.title}</h3>
                <span className={`badge ${statusColor[c.status] || 'badge-blue'}`}>
                  {c.status === 'active' ? '● LIVE' : c.status}
                </span>
              </div>
              {c.description && <p className="contest-card-desc">{c.description.slice(0, 80)}{c.description.length > 80 ? '...' : ''}</p>}
              <div className="contest-card-meta">
                <span>👤 {c.creator?.username}</span>
                <span>📋 {c.problems?.length || 0} problems</span>
                <span>👥 {c.participants?.length || 0}</span>
              </div>
              <div className="contest-card-time">
                <span>🕐 {formatDate(c.startTime)}</span>
                {c.isPrivate ? <span className="badge badge-purple">🔒 Private</span> : <span className="badge badge-blue">🌐 Public</span>}
              </div>
            </Link>
          ))}
        </div>
       )}
    </div>
  );
};

export default ContestsPage;
