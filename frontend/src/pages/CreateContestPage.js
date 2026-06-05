import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './CreateContestPage.css';

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const CreateContestPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', startTime: '', endTime: '',
    isPrivate: true, type: 'individual', scoringType: 'icpc'
  });
  const [problems, setProblems] = useState([]);
  const [problemSearch, setProblemSearch] = useState({ minRating: 800, maxRating: 2000, tags: '', page: 1 });
  const [cfProblems, setCfProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [tags, setTags] = useState([]);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    axios.get('/api/problems/tags', { headers: authHeader() })
      .then(r => setTags(r.data.tags || []));
  }, []);

  const searchProblems = async () => {
    setLoadingProblems(true);
    try {
      const { minRating, maxRating, tags: t, page } = problemSearch;
      const params = new URLSearchParams({ minRating, maxRating, page, limit: 30 });
      if (t) params.set('tags', t);
      const res = await axios.get(`/api/problems?${params}`, { headers: authHeader() });
      setCfProblems(res.data.problems || []);
    } catch { toast.error('Failed to fetch problems'); }
    finally { setLoadingProblems(false); }
  };

  const addProblem = (p) => {
    if (problems.find(x => x.cfContestId === p.contestId && x.cfIndex === p.index)) {
      toast.error('Already added');
      return;
    }
    setProblems(prev => [...prev, {
      cfContestId: p.contestId,
      cfIndex: p.index,
      name: p.name,
      rating: p.rating,
      tags: p.tags,
      points: Math.max(100, Math.floor((p.rating || 1000) / 10) * 10)
    }]);
    toast.success(`Added: ${p.name}`);
  };

  const removeProblem = (idx) => setProblems(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!form.title || !form.startTime || !form.endTime) { toast.error('Fill all required fields'); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) { toast.error('End time must be after start time'); return; }
    if (problems.length === 0) { toast.error('Add at least one problem'); return; }
    setCreating(true);
    try {
      const res = await axios.post('/api/contests', { ...form, problems }, { headers: authHeader() });
      toast.success('Contest created!');
      navigate(`/contests/${res.data._id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create'); }
    finally { setCreating(false); }
  };

  const minStart = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="page-container">
      <h1 className="page-title">➕ Create Contest</h1>
      <div className="create-steps">
        {['Details', 'Problems', 'Review'].map((s, i) => (
          <div key={s} className={`step ${step === i+1 ? 'active' : step > i+1 ? 'done' : ''}`} onClick={() => step > i+1 && setStep(i+1)}>
            <span className="step-num">{step > i+1 ? '✓' : i+1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card create-form">
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Contest Title *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="My Awesome Contest" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Contest description..." rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label>Start Time *</label>
              <input type="datetime-local" min={minStart} value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
            </div>
            <div className="form-group">
              <label>End Time *</label>
              <input type="datetime-local" min={form.startTime || minStart} value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Contest Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div className="form-group">
              <label>Scoring</label>
              <select value={form.scoringType} onChange={e => setForm({...form, scoringType: e.target.value})}>
                <option value="icpc">ICPC Style (penalty)</option>
                <option value="points">Points Based</option>
              </select>
            </div>
            <div className="form-group">
              <label>Visibility</label>
              <div className="toggle-row">
                <button className={`toggle-btn ${form.isPrivate ? 'active' : ''}`} onClick={() => setForm({...form, isPrivate: true})}>🔒 Private (invite only)</button>
                <button className={`toggle-btn ${!form.isPrivate ? 'active' : ''}`} onClick={() => setForm({...form, isPrivate: false})}>🌐 Public</button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-lg" onClick={() => { if (!form.title || !form.startTime || !form.endTime) { toast.error('Fill required fields'); return; } setStep(2); searchProblems(); }}>
              Next: Add Problems →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="problems-step">
          <div className="problems-search-panel card">
            <h3 style={{ marginBottom: 16 }}>🔍 Search Codeforces Problems</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                <label>Min Rating</label>
                <input type="number" min={800} max={3500} step={100} value={problemSearch.minRating} onChange={e => setProblemSearch({...problemSearch, minRating: +e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                <label>Max Rating</label>
                <input type="number" min={800} max={3500} step={100} value={problemSearch.maxRating} onChange={e => setProblemSearch({...problemSearch, maxRating: +e.target.value})} />
              </div>
              <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                <label>Tags (comma separated)</label>
                <input placeholder="dp, graphs, math..." value={problemSearch.tags} onChange={e => setProblemSearch({...problemSearch, tags: e.target.value})} />
              </div>
              <button className="btn btn-primary" onClick={searchProblems} disabled={loadingProblems}>
                {loadingProblems ? '...' : '🔍 Search'}
              </button>
            </div>
            <div className="tags-quick">
              {tags.slice(0, 12).map(t => (
                <button key={t} className={`tag-chip ${problemSearch.tags === t ? 'active' : ''}`} onClick={() => { setProblemSearch({...problemSearch, tags: t}); }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="problems-columns">
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>CF Problems {cfProblems.length > 0 && `(${cfProblems.length})`}</h3>
              {loadingProblems ? <div className="loading-spinner"><div className="spinner"/></div> :
               cfProblems.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Search for problems above</p> :
               <div className="cf-problems-list">
                 {cfProblems.map((p, i) => {
                   const added = problems.find(x => x.cfContestId === p.contestId && x.cfIndex === p.index);
                   return (
                     <div key={i} className={`cf-problem-item ${added ? 'added' : ''}`}>
                       <div>
                         <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                         <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>CF{p.contestId}{p.index} · ⭐{p.rating}</div>
                       </div>
                       <button className={`btn btn-sm ${added ? 'btn-secondary' : 'btn-success'}`} onClick={() => !added && addProblem(p)} disabled={!!added}>
                         {added ? '✓' : '+'}
                       </button>
                     </div>
                   );
                 })}
               </div>}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Selected Problems ({problems.length})</h3>
              {problems.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No problems selected yet</p> :
               problems.map((p, i) => (
                 <div key={i} className="selected-problem">
                   <span className="problem-index">{String.fromCharCode(65 + i)}</span>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                     <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>⭐{p.rating} · {p.points} pts</div>
                   </div>
                   <button className="btn btn-sm btn-danger" onClick={() => removeProblem(i)}>✕</button>
                 </div>
               ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={() => { if (problems.length === 0) { toast.error('Add at least one problem'); return; } setStep(3); }}>
              Review Contest →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>✅ Review Your Contest</h3>
          <div className="review-section">
            <div className="review-row"><span>Title</span><strong>{form.title}</strong></div>
            <div className="review-row"><span>Start</span><strong>{new Date(form.startTime).toLocaleString()}</strong></div>
            <div className="review-row"><span>End</span><strong>{new Date(form.endTime).toLocaleString()}</strong></div>
            <div className="review-row"><span>Duration</span><strong>{Math.floor((new Date(form.endTime) - new Date(form.startTime)) / 60000)} minutes</strong></div>
            <div className="review-row"><span>Type</span><strong>{form.type} / {form.scoringType}</strong></div>
            <div className="review-row"><span>Visibility</span><strong>{form.isPrivate ? '🔒 Private' : '🌐 Public'}</strong></div>
            <div className="review-row"><span>Problems</span><strong>{problems.length} problems</strong></div>
          </div>
          <div className="selected-problems-preview">
            {problems.map((p, i) => (
              <div key={i} className="review-problem">
                <span className="problem-index">{String.fromCharCode(65 + i)}</span>
                <span>{p.name}</span>
                <span className="badge badge-orange">⭐{p.rating}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : '🚀 Launch Contest'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateContestPage;
