import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { db, listJobs, upsertJobs, updateStatus, deleteJob, stats, saveProfile, logEmail, updateJobCoverLetter } from './db.js';
import { fetchAllJobs } from './fetcher.js';
import { startScheduler } from './scheduler.js';
import { sendDigest, sendAutoApplyNotification } from './email.js';
import { getProfile, updateProfile, matchJob, generateCoverLetter, prepareApplication } from './profile.js';
import { analyzeJobWithLLM, generateCoverLetterLLM } from './llm.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const INGEST_TOKEN = process.env.INGEST_TOKEN || '';

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/jobs', (req, res) => {
  const { status, source, minScore, search, limit } = req.query;
  res.json(listJobs({ status, source, minScore, search, limit }));
});

app.get('/api/stats', (_req, res) => res.json(stats()));

app.patch('/api/jobs/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  const changed = updateStatus(req.params.id, status);
  if (!changed) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

app.delete('/api/jobs/:id', (req, res) => {
  const changed = deleteJob(req.params.id);
  if (!changed) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// n8n -> backend ingest. Accepts a single job or an array.
app.post('/api/ingest', (req, res) => {
  if (INGEST_TOKEN) {
    const token = req.headers['x-ingest-token'];
    if (token !== INGEST_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  }
  const body = req.body;
  const jobs = Array.isArray(body) ? body : (body?.jobs || [body]);
  const inserted = upsertJobs(jobs);
  res.json({ ok: true, received: jobs.length, upserted: inserted });
});

// Refresh: pull fresh jobs from LinkedIn & Indeed only
app.post('/api/refresh', async (req, res) => {
  try {
    const jobs = await fetchAllJobs();
    if (jobs.length === 0) {
      return res.json({ ok: true, message: 'No new jobs found. Set JSEARCH_API_KEY env variable to fetch from LinkedIn & Indeed.', upserted: 0 });
    }
    const upserted = upsertJobs(jobs);
    res.json({ ok: true, fetched: jobs.length, upserted });
  } catch (e) {
    console.error('[refresh] Error:', e);
    res.status(500).json({ error: 'Failed to fetch jobs', details: e.message });
  }
});

// Manual trigger: send email digest now
app.post('/api/send-digest', async (req, res) => {
  try {
    const allJobs = listJobs({ limit: 500 });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = allJobs.filter(j => {
      const d = new Date(j.date || j.posted_at);
      return !isNaN(d.getTime()) && d >= sevenDaysAgo;
    });
    recent.sort((a, b) => (b.score - a.score) || (b.date || '').localeCompare(a.date || ''));
    const top10 = recent.slice(0, 10).map(j => ({
      title: j.title, company: j.company, source: j.source,
      location: j.location, posted_at: j.posted_at || j.date,
      score: j.score, summary: j.summary || '', apply_link: j.link,
    }));
    const result = await sendDigest(top10);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PROFILE APIs ─────────────────────────────────────────────────
app.get('/api/profile', (_req, res) => res.json(getProfile()));

app.patch('/api/profile', (req, res) => {
  const updated = updateProfile(req.body);
  res.json(updated);
});

// ─── AI MATCHING: re-score all jobs with profile match ────────────
app.post('/api/match-all', (req, res) => {
  const allJobs = listJobs({ limit: 1000 });
  let matched = 0;
  let autoEligible = 0;

  for (const job of allJobs) {
    const result = matchJob(job);
    try {
      db.prepare(`UPDATE jobs SET score = ?, reason = ?, skills_match = ?, skills_missing = ?, auto_apply_eligible = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(result.score, result.reason, result.skills_match.join(', '), result.skills_missing.join(', '), result.auto_apply_eligible ? 1 : 0, job.id);
      matched++;
      if (result.auto_apply_eligible) autoEligible++;
    } catch (_e) { /* skip failed update */ }
  }

  res.json({ ok: true, total: allJobs.length, matched, auto_apply_eligible: autoEligible });
});

// ─── COVER LETTER: generate for a specific job ────────────────────
app.get('/api/jobs/:id/cover-letter', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  const letter = generateCoverLetter(job);
  // Save to DB
  try { db.prepare('UPDATE jobs SET cover_letter = ? WHERE id = ?').run(letter, job.id); } catch(_e) { /* ignore */ }
  res.json({ job_id: job.id, title: job.title, company: job.company, cover_letter: letter });
});

// ─── APPLICATION PACKAGE: prepare full apply package ──────────────
app.get('/api/jobs/:id/apply-package', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  const result = matchJob(job);
  const pkg = prepareApplication(job, result);
  res.json(pkg);
});

// ─── MARK AS APPLIED (with LLM analysis) ─────────────────────────
app.post('/api/jobs/:id/applied', async (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'not found' });
  const now = new Date().toISOString();

  // Run LLM analysis if OpenAI key available
  let llmAnalysis = null;
  if (process.env.OPENAI_API_KEY) {
    try {
      llmAnalysis = await analyzeJobWithLLM(job);
      if (llmAnalysis.success) {
        db.prepare(`UPDATE jobs SET reason = ?, skills_match = ?, skills_missing = ? WHERE id = ?`).run(
          llmAnalysis.match_reason || job.reason,
          (llmAnalysis.skills_matched || []).join(', '),
          (llmAnalysis.skills_missing || []).join(', '),
          job.id
        );
      }
    } catch (e) { console.error('[llm] Analysis error:', e.message); }
  }

  // Generate LLM cover letter if not already present
  if (!job.cover_letter && process.env.OPENAI_API_KEY) {
    try {
      const letter = await generateCoverLetterLLM(job, llmAnalysis);
      if (letter) updateJobCoverLetter(job.id, letter);
      job.cover_letter = letter;
    } catch (e) { console.error('[llm] Cover letter error:', e.message); }
  }

  db.prepare(`UPDATE jobs SET status = 'Applied', applied_at = ?, updated_at = datetime('now') WHERE id = ?`).run(now, job.id);
  // Insert into applications table
  try {
    db.prepare(`INSERT OR REPLACE INTO applications (id, job_id, status, cover_letter, applied_at) VALUES (?, ?, 'Applied', ?, ?)`)
      .run(`app-${job.id}`, job.id, job.cover_letter || '', now);
  } catch(_e) { /* ignore */ }
  // Send email notification with LLM analysis
  const enrichedJob = { ...job, reason: llmAnalysis?.match_reason || job.reason, skills_match: llmAnalysis ? (llmAnalysis.skills_matched || []).join(', ') : job.skills_match, skills_missing: llmAnalysis ? (llmAnalysis.skills_missing || []).join(', ') : job.skills_missing };
  const emailResult = await sendAutoApplyNotification(enrichedJob, 'success', job.cover_letter || '', llmAnalysis);
  if (emailResult.sent) logEmail('auto_apply_notification', `Applied: ${job.title} @ ${job.company}`, 'raleem811811@gmail.com', 1);
  res.json({ ok: true, job_id: job.id, applied_at: now, email_sent: emailResult.sent, llm_analysis: llmAnalysis?.success || false });
});

// ─── GET APPLICATIONS ─────────────────────────────────────────────
app.get('/api/applications', (_req, res) => {
  const apps = db.prepare(`SELECT a.*, j.title, j.company, j.link, j.score, j.source FROM applications a JOIN jobs j ON a.job_id = j.id ORDER BY a.created_at DESC`).all();
  res.json(apps);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  // Persist user profile to DB on startup
  saveProfile(getProfile());
  startScheduler();
});
