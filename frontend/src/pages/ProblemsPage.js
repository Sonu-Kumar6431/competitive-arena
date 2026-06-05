import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ProblemsPage.css';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const RATINGS = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3200, 3500];

const ProblemsPage = () => {
  const [problems, setProblems] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ minRating: '', maxRating: '', tags: [] });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    axios.get('/api/problems/tags', { headers: authHeader() }).then(r => setTags(r.data.tags));
  }, []);

  const fetchProblems = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (filters.minRating) params.set('minRating', filters.minRating);
      if (filters.maxRating) params.set('maxRating', filters.maxRating);
      if (filters.tags.length) params.set('tags', filters.tags.join(','));
      const res = await axios.get(`/api/problems?${params}`, { headers: authHeader() });
      setProblems(res.data.problems || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch { toast.error('Failed to load problems'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProblems(1); }, []);

  const toggleTag = (tag) => {
    setFilters(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  };

  const ratingColor = (r) => {
    if (!r) return 'var(--text-muted)';
    if (r < 1200) return '#808080';
    if (r < 1400) return '#008000';
    if (r < 1600) return '#03a89e';
    if (r < 1900) return '#0000ff';
    if (r < 2100) return '#aa00aa';
    if (r < 2400) return '#ff8c00';
    return '#ff0000';
  };

  const LIMIT = 50;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page-container">
      <h1 className="page-title">💡 Practice Problems</h1>

      <div className="problems-layout">
        <div className="filters-panel card">
          <h3 style={{ marginBottom: 16, fontSize: 15 }}>Filters</h3>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Min Rating</label>
            <select value={filters.minRating} onChange={e => setFilters({...filters, minRating: e.target.value})}>
              <option value="">Any</option>
              {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Max Rating</label>
            <select value={filters.maxRating} onChange={e => setFilters({...filters, maxRating: e.target.value})}>
              <option value="">Any</option>
              {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Tags</label>
            <div className="filter-tags">
              {tags.map(t => (
                <button key={t} className={`tag-chip-small ${filters.tags.includes(t) ? 'active' : ''}`} onClick={() => toggleTag(t)}>{t}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => fetchProblems(1)} disabled={loading}>
            {loading ? 'Loading...' : '🔍 Apply Filters'}
          </button>
          {(filters.tags.length > 0 || filters.minRating || filters.maxRating) && (
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => { setFilters({ minRating: '', maxRating: '', tags: [] }); setTimeout(() => fetchProblems(1), 0); }}>
              ✕ Clear Filters
            </button>
          )}
        </div>

        <div className="problems-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{total.toLocaleString()} problems found</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => fetchProblems(page - 1)}>← Prev</button>
              <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
              <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => fetchProblems(page + 1)}>Next →</button>
            </div>
          </div>

          {loading ? <div className="loading-spinner"><div className="spinner"/></div> : (
            <div className="problems-table-wrap">
              <table className="problems-table">
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Tags</th>
                    <th>Rating</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <a href={`https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`}
                           target="_blank" rel="noopener noreferrer" className="problem-link">
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginRight: 8 }}>{p.contestId}{p.index}</span>
                          {p.name}
                        </a>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.tags?.slice(0, 3).map(t => <span key={t} className="tag-chip-small">{t}</span>)}
                          {p.tags?.length > 3 && <span className="tag-chip-small">+{p.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: ratingColor(p.rating), fontFamily: 'var(--font-mono)' }}>{p.rating || '?'}</strong>
                      </td>
                      <td>
                        <a href={`https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`}
                           target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                          Solve ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemsPage;
