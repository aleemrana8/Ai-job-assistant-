const base = '/api';

export async function fetchJobs(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  const r = await fetch(`${base}/jobs${qs ? '?' + qs : ''}`);
  if (!r.ok) throw new Error('Failed to load jobs');
  return r.json();
}

export async function fetchStats() {
  const r = await fetch(`${base}/stats`);
  if (!r.ok) throw new Error('Failed to load stats');
  return r.json();
}

export async function setStatus(id, status) {
  const r = await fetch(`${base}/jobs/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) throw new Error('Failed to update status');
  return r.json();
}

export async function deleteJob(id) {
  const r = await fetch(`${base}/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Failed to delete');
  return r.json();
}

export async function refreshJobs() {
  const r = await fetch(`${base}/refresh`, { method: 'POST' });
  if (!r.ok) throw new Error('Failed to refresh jobs');
  return r.json();
}

export async function getCoverLetter(id) {
  const r = await fetch(`${base}/jobs/${encodeURIComponent(id)}/cover-letter`);
  if (!r.ok) throw new Error('Failed to generate cover letter');
  return r.json();
}

export async function getApplyPackage(id) {
  const r = await fetch(`${base}/jobs/${encodeURIComponent(id)}/apply-package`);
  if (!r.ok) throw new Error('Failed to get apply package');
  return r.json();
}

export async function markApplied(id) {
  const r = await fetch(`${base}/jobs/${encodeURIComponent(id)}/applied`, { method: 'POST' });
  if (!r.ok) throw new Error('Failed to mark as applied');
  return r.json();
}

export async function matchAllJobs() {
  const r = await fetch(`${base}/match-all`, { method: 'POST' });
  if (!r.ok) throw new Error('Failed to match jobs');
  return r.json();
}

export async function getProfile() {
  const r = await fetch(`${base}/profile`);
  if (!r.ok) throw new Error('Failed to load profile');
  return r.json();
}
