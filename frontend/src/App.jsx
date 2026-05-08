import { Fragment, useEffect, useMemo, useState, useCallback } from 'react';
import { fetchJobs, fetchStats, setStatus, deleteJob, refreshJobs, getCoverLetter, markApplied, matchAllJobs } from './api.js';

const STATUSES = ['New', 'MATCHED', 'AUTO_APPLIED', 'NEEDS_REVIEW', 'Applied', 'Interview', 'Offer', 'Rejected', 'FAILED'];

function scoreClass(s) {
  if (s >= 8) return 'hi';
  if (s >= 5) return 'mid';
  return 'lo';
}

function statusBadge(status) {
  const colors = {
    'AUTO_APPLIED': '#10b981',
    'MATCHED': '#667eea',
    'NEEDS_REVIEW': '#f59e0b',
    'FAILED': '#ef4444',
    'Interview': '#8b5cf6',
    'Offer': '#06b6d4',
  };
  return colors[status] || null;
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '', source: '', minScore: '' });
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [j, s] = await Promise.all([fetchJobs(filters), fetchStats()]);
      setJobs(j);
      setStats(s);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { load(); }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [load]);

  const sources = useMemo(() => {
    const set = new Set(jobs.map(j => j.source).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  async function onStatusChange(id, status) {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, status } : j)));
    try { await setStatus(id, status); } catch (e) { setErr(e.message); load(); }
  }

  async function onDelete(id) {
    if (!confirm('Delete this job?')) return;
    setJobs(prev => prev.filter(j => j.id !== id));
    try { await deleteJob(id); } catch (e) { setErr(e.message); load(); }
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>🤖 AI Career Agent</h1>
          <div className="sub">Autonomous PM/Product Manager job finder • LinkedIn & Indeed • Auto-matched to your CV</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async () => {
            try { await matchAllJobs(); await load(); } catch(e) { setErr(e.message); }
          }}>🧠 AI Match</button>
          <button onClick={async () => {
            setRefreshing(true);
            setErr('');
            try {
              await refreshJobs();
              await load();
            } catch (e) {
              setErr(e.message);
            } finally {
              setRefreshing(false);
            }
          }} disabled={refreshing || loading}>
          {refreshing ? 'Fetching new jobs…' : 'Refresh'}
        </button>
        </div>
      </div>

      {stats && (
        <div className="stats">
          <Stat label="Total Jobs" value={stats.total} />
          <Stat label="Avg Score" value={stats.avgScore} />
          <Stat label="Statuses" value={stats.byStatus.map(s => `${s.status}:${s.n}`).join(' · ') || '—'} />
          <Stat label="Sources" value={stats.bySource.map(s => `${s.source || '?'}:${s.n}`).join(' · ') || '—'} />
        </div>
      )}

      <div className="toolbar">
        <input
          className="grow"
          placeholder="Search title, company, summary…"
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
          <option value="">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.minScore} onChange={e => setFilters(f => ({ ...f, minScore: e.target.value }))}>
          <option value="">Min score</option>
          <option value="8">≥ 8 (Auto-Apply)</option>
          <option value="6">≥ 6</option>
          <option value="4">≥ 4</option>
        </select>
        <button className="ghost" onClick={() => setFilters({ search: '', status: '', source: '', minScore: '' })}>Clear</button>
      </div>

      {err && <div className="empty" style={{ color: 'var(--red)' }}>{err}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Score</th>
              <th>Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Source</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && !loading && (
              <tr><td colSpan={8} className="empty">No jobs yet. Run your n8n workflow to ingest some.</td></tr>
            )}
            {jobs.map(j => (
              <Fragment key={j.id}>
                <tr onClick={() => setOpenId(openId === j.id ? null : j.id)} style={{ cursor: 'pointer' }}>
                  <td><span className={`score ${scoreClass(j.score)}`}>{j.score}</span></td>
                  <td>
                    {j.link
                      ? <a href={j.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{j.title}</a>
                      : j.title}
                  </td>
                  <td>{j.company}</td>
                  <td className="muted">{j.location}</td>
                  <td className="muted">{j.source}</td>
                  <td className="muted">{j.date}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <select
                      className="status-select"
                      value={j.status || 'New'}
                      onChange={e => onStatusChange(j.id, e.target.value)}
                      style={statusBadge(j.status) ? { color: statusBadge(j.status), fontWeight: 600 } : {}}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="ghost" style={{ padding: '4px 8px', fontSize: 12, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} onClick={() => onDelete(j.id)}>✕</button>
                  </td>
                </tr>
                {openId === j.id && (
                  <tr className="row-detail">
                    <td colSpan={8}>
                      <div className="detail-grid">
                        <div>
                          <h4>Summary</h4>
                          <div>{j.summary || <span className="muted">—</span>}</div>
                          <h4 style={{ marginTop: 12 }}>Why this matches</h4>
                          <div>{j.reason || <span className="muted">—</span>}</div>
                        </div>
                        <div>
                          <h4>Skills you have</h4>
                          <div>{(j.skills_match || '').split(',').filter(Boolean).map(s => <span className="tag" key={s}>{s.trim()}</span>) || '—'}</div>
                          <h4 style={{ marginTop: 12 }}>Skills to learn</h4>
                          <div>{(j.skills_missing || '').split(',').filter(Boolean).map(s => <span className="tag" key={s}>{s.trim()}</span>) || '—'}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button style={{ padding: '8px 16px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                          onClick={async (e) => { e.stopPropagation(); const cl = await getCoverLetter(j.id); alert(cl.cover_letter); }}>
                          📝 Cover Letter
                        </button>
                        {j.link && <a href={j.link} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}
                          onClick={e => e.stopPropagation()}>
                          � View Job Details & Apply
                        </a>}
                        {j.status !== 'Applied' && j.status !== 'AUTO_APPLIED' && <button style={{ padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                          onClick={async (e) => { e.stopPropagation(); await markApplied(j.id); load(); }}>
                          ✅ Mark Applied
                        </button>}
                        {j.status === 'AUTO_APPLIED' && <span style={{ padding: '8px 12px', background: '#10b981', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>🤖 Auto-Applied</span>}
                        {j.status === 'NEEDS_REVIEW' && <span style={{ padding: '8px 12px', background: '#f59e0b', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>⚠️ Needs Review</span>}
                        {j.score >= 8 && j.status === 'New' && <span style={{ padding: '8px 12px', background: '#667eea', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>⭐ Auto-Apply Eligible</span>}
                        {j.applied_at && <span style={{ fontSize: 11, color: '#666', marginLeft: 8 }}>Applied: {new Date(j.applied_at).toLocaleString()}</span>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
