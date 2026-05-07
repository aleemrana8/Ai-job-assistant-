import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'jobs.db'));
db.exec(`PRAGMA journal_mode = WAL;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id              TEXT PRIMARY KEY,
    date            TEXT NOT NULL,
    title           TEXT NOT NULL,
    company         TEXT,
    location        TEXT,
    remote_type     TEXT,
    posted_at       TEXT,
    score           INTEGER DEFAULT 0,
    link            TEXT,
    source_url      TEXT,
    status          TEXT DEFAULT 'New',
    source          TEXT,
    summary         TEXT,
    reason          TEXT,
    skills_match    TEXT,
    skills_missing  TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_score  ON jobs(score DESC);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
`);

// Add columns for the career agent (cover letter, application tracking)
try { db.exec(`ALTER TABLE jobs ADD COLUMN cover_letter TEXT DEFAULT ''`); } catch(e) {}
try { db.exec(`ALTER TABLE jobs ADD COLUMN applied_at TEXT DEFAULT ''`); } catch(e) {}
try { db.exec(`ALTER TABLE jobs ADD COLUMN auto_apply_eligible INTEGER DEFAULT 0`); } catch(e) {}

// Applications tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id              TEXT PRIMARY KEY,
    job_id          TEXT NOT NULL,
    status          TEXT DEFAULT 'Ready',
    cover_letter    TEXT,
    applied_at      TEXT,
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );
`);

// User profile storage
db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    data        TEXT NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now'))
  );
`);

// Email log table
db.exec(`
  CREATE TABLE IF NOT EXISTS email_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    subject     TEXT,
    recipients  TEXT,
    job_count   INTEGER DEFAULT 0,
    sent_at     TEXT DEFAULT (datetime('now'))
  );
`);

const upsertStmt = db.prepare(`
  INSERT INTO jobs (id, date, title, company, location, remote_type, posted_at, score, link, source_url, status, source, summary, reason, skills_match, skills_missing)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    score          = excluded.score,
    summary        = excluded.summary,
    reason         = excluded.reason,
    skills_match   = excluded.skills_match,
    skills_missing = excluded.skills_missing,
    updated_at     = datetime('now')
`);

function makeId(job) {
  if (job.id) return String(job.id);
  if (job.link) return job.link;
  return `${(job.title || '').toLowerCase()}|${(job.company || '').toLowerCase()}`;
}

function joinIfArray(v) {
  if (Array.isArray(v)) return v.join(', ');
  return v ?? '';
}

export function upsertJobs(rawJobs = []) {
  db.exec('BEGIN');
  let inserted = 0;
  try {
    for (const j of rawJobs) {
      const r = upsertStmt.run(
        makeId(j),
        j.date || new Date().toISOString().slice(0, 10),
        j.title || '',
        j.company || '',
        j.location || '',
        j.remote_type || j.remoteType || '',
        j.posted_at || j.postedAt || '',
        Number(j.score) || 0,
        j.link || j.apply_link || j.url || '',
        j.source_url || j.sourceUrl || '',
        j.status || 'New',
        j.source || '',
        j.summary || '',
        j.reason || '',
        joinIfArray(j.skills_match || j.SkillsMatch),
        joinIfArray(j.skills_missing || j.SkillsMissing),
      );
      if (r.changes) inserted++;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return inserted;
}

export function listJobs({ status, source, minScore, search, limit = 500 } = {}) {
  const where = [];
  const params = [];
  if (status)   { where.push('status = ?');  params.push(status); }
  if (source)   { where.push('source = ?');  params.push(source); }
  if (minScore != null && minScore !== '') { where.push('score >= ?'); params.push(Number(minScore)); }
  if (search)   {
    where.push('(title LIKE ? OR company LIKE ? OR summary LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  const sql = `
    SELECT * FROM jobs
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY score DESC, date DESC
    LIMIT ${Number(limit) || 500}
  `;
  return db.prepare(sql).all(...params);
}

export function updateStatus(id, status) {
  return db.prepare(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id).changes;
}

export function deleteJob(id) {
  return db.prepare(`DELETE FROM jobs WHERE id = ?`).run(id).changes;
}

export function stats() {
  const total = db.prepare(`SELECT COUNT(*) AS n FROM jobs`).get().n;
  const byStatus = db.prepare(`SELECT status, COUNT(*) AS n FROM jobs GROUP BY status`).all();
  const bySource = db.prepare(`SELECT source, COUNT(*) AS n FROM jobs GROUP BY source`).all();
  const avgRow = db.prepare(`SELECT ROUND(AVG(score),1) AS avg FROM jobs`).get();
  const avgScore = avgRow?.avg ?? 0;
  const top = db.prepare(`SELECT id, title, company, score FROM jobs ORDER BY score DESC LIMIT 5`).all();
  return { total, avgScore, byStatus, bySource, top };
}

export function saveProfile(profileObj) {
  db.prepare(`INSERT OR REPLACE INTO user_profile (id, data, updated_at) VALUES (1, ?, datetime('now'))`).run(JSON.stringify(profileObj));
}

export function loadProfile() {
  const row = db.prepare(`SELECT data FROM user_profile WHERE id = 1`).get();
  return row ? JSON.parse(row.data) : null;
}

export function logEmail(type, subject, recipients, jobCount) {
  db.prepare(`INSERT INTO email_log (type, subject, recipients, job_count) VALUES (?, ?, ?, ?)`).run(type, subject, recipients, jobCount);
}

export function updateJobCoverLetter(id, coverLetter) {
  db.prepare(`UPDATE jobs SET cover_letter = ?, updated_at = datetime('now') WHERE id = ?`).run(coverLetter, id);
}

export function markJobApplied(id) {
  db.prepare(`UPDATE jobs SET status = 'AUTO_APPLIED', applied_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(id);
}

export function getApplications() {
  return db.prepare(`SELECT * FROM applications ORDER BY created_at DESC LIMIT 100`).all();
}
