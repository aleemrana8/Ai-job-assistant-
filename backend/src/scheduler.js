import cron from 'node-cron';
import { fetchAllJobs } from './fetcher.js';
import { db, upsertJobs, listJobs, logEmail, updateJobCoverLetter } from './db.js';
import { sendDigest, sendAutoApplyNotification } from './email.js';
import { matchJob, generateCoverLetter } from './profile.js';
import { analyzeJobWithLLM, generateCoverLetterLLM } from './llm.js';

/**
 * AI Career Agent Scheduler — Autonomous Auto-Apply System with OpenAI LLM
 * - Every 5 minutes: fetch → LLM analyze → score → generate cover letters → auto-apply → notify with full details
 * - Also picks up any previously missed unapplied eligible jobs
 * - At 2:30 AM and 2:30 PM: send full email digest
 */
export function startScheduler() {
  // Every 5 minutes: fetch, analyze with LLM, process, and auto-apply
  cron.schedule('*/5 * * * *', async () => {
    console.log(`[scheduler] 🔄 Fetching jobs... ${new Date().toISOString()}`);
    try {
      const jobs = await fetchAllJobs();
      if (jobs.length > 0) {
        // Basic match scoring first
        const enrichedJobs = jobs.map(job => {
          const result = matchJob(job);
          return {
            ...job,
            score: result.score,
            reason: result.reason,
            skills_match: result.skills_match.join(', '),
            skills_missing: result.skills_missing.join(', '),
          };
        });

        const upserted = upsertJobs(enrichedJobs);
        console.log(`[scheduler] ✅ Fetched ${jobs.length}, upserted ${upserted}`);

        // Mark moderate-match jobs (score 5-7) as MATCHED
        const moderateJobs = enrichedJobs.filter(j => j.score >= 5 && j.score < 8);
        for (const job of moderateJobs) {
          db.prepare('UPDATE jobs SET status = ? WHERE id = ? AND status = ?').run('MATCHED', job.id, 'New');
        }
      } else {
        console.log('[scheduler] No new jobs found this cycle');
      }
    } catch (e) {
      console.error('[scheduler] Fetch error:', e.message);
    }

    // Now process ALL unapplied eligible jobs (score >= 8, not yet applied)
    await processUnappliedJobs();
  });

  // At 2:30 AM and 2:30 PM: send comprehensive email digest
  cron.schedule('30 2,14 * * *', async () => {
    console.log(`[scheduler] 📧 Sending email digest... ${new Date().toISOString()}`);
    try {
      const allJobs = listJobs({ limit: 500 });
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentJobs = allJobs.filter(j => {
        const jobDate = new Date(j.date || j.posted_at);
        return jobDate >= sevenDaysAgo;
      });

      recentJobs.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.date || '').localeCompare(a.date || '');
      });

      const autoApplied = allJobs.filter(j => j.status === 'AUTO_APPLIED').length;
      const needsReview = allJobs.filter(j => j.status === 'NEEDS_REVIEW').length;
      const matched = allJobs.filter(j => j.status === 'MATCHED').length;

      const emailJobs = recentJobs.slice(0, 10).map(j => ({
        title: j.title, company: j.company, source: j.source,
        location: j.location, posted_at: j.posted_at || j.date,
        score: j.score, summary: j.summary || '', apply_link: j.link,
        status: j.status || 'New', auto_apply_eligible: j.score >= 8,
      }));

      await sendDigest(emailJobs);
      logEmail('digest', `Daily Digest - ${allJobs.length} total, ${autoApplied} applied, ${needsReview} review`, 'raleem811811@gmail.com', emailJobs.length);
      console.log(`[scheduler] 📊 Digest: ${allJobs.length} total | ${autoApplied} applied | ${matched} matched | ${needsReview} review`);
    } catch (e) {
      console.error('[scheduler] Email error:', e.message);
    }
  });

  console.log('[scheduler] 🤖 AI Career Agent started — fetching every 5 min, LLM auto-apply for score≥8, email at 2:30 AM & 2:30 PM');
}

/**
 * Process all unapplied eligible jobs with full LLM analysis pipeline
 */
async function processUnappliedJobs() {
  // Find all jobs with score >= 8 that haven't been applied to yet
  const eligible = db.prepare(
    `SELECT * FROM jobs WHERE score >= 8 AND status IN ('New', 'MATCHED') ORDER BY score DESC`
  ).all();

  if (eligible.length === 0) return;

  console.log(`[auto-apply] 🎯 Found ${eligible.length} unapplied eligible jobs. Processing with LLM...`);

  for (const job of eligible) {
    try {
      // Step 1: Deep LLM Analysis
      console.log(`[auto-apply] 🧠 Analyzing: ${job.title} @ ${job.company}...`);
      const analysis = await analyzeJobWithLLM(job);

      let llmAnalysis = null;
      if (analysis.success) {
        llmAnalysis = analysis;
        // Update job with LLM insights
        db.prepare(`UPDATE jobs SET 
          reason = ?, 
          skills_match = ?, 
          skills_missing = ?,
          score = ?
          WHERE id = ?`
        ).run(
          analysis.match_reason || job.reason,
          (analysis.skills_matched || []).join(', '),
          (analysis.skills_missing || []).join(', '),
          Math.max(job.score, analysis.match_score || job.score),
          job.id
        );
        console.log(`[auto-apply] ✅ LLM Score: ${analysis.match_score}/10 | Confidence: ${analysis.confidence} | Action: ${analysis.recommended_action}`);

        // If LLM recommends skip, mark as NEEDS_REVIEW
        if (analysis.recommended_action === 'skip') {
          db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run('NEEDS_REVIEW', job.id);
          console.log(`[auto-apply] ⏭️ LLM recommends skip for: ${job.title}`);
          continue;
        }
      } else {
        console.log(`[auto-apply] ⚠️ LLM analysis failed, using basic scoring for: ${job.title}`);
      }

      // Step 2: Generate tailored cover letter with LLM
      let coverLetter = '';
      const llmCoverLetter = await generateCoverLetterLLM(job, llmAnalysis);
      if (llmCoverLetter) {
        coverLetter = llmCoverLetter;
      } else {
        // Fallback to template-based cover letter
        coverLetter = generateCoverLetter(job);
      }
      updateJobCoverLetter(job.id, coverLetter);

      // Step 3: Mark as AUTO_APPLIED
      db.prepare(
        `UPDATE jobs SET auto_apply_eligible = 1, status = 'AUTO_APPLIED', applied_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).run(job.id);

      console.log(`[auto-apply] 🚀 Auto-applied: ${job.title} @ ${job.company} (Score: ${job.score})`);

      // Step 4: Send detailed notification email with ALL LLM analysis
      const enrichedJob = {
        ...job,
        reason: llmAnalysis?.match_reason || job.reason,
        skills_match: llmAnalysis ? (llmAnalysis.skills_matched || []).join(', ') : job.skills_match,
        skills_missing: llmAnalysis ? (llmAnalysis.skills_missing || []).join(', ') : job.skills_missing,
        score: llmAnalysis?.match_score || job.score,
        llm_analysis: llmAnalysis,
      };

      await sendAutoApplyNotification(enrichedJob, 'success', coverLetter, llmAnalysis);
      logEmail('auto_apply', `Auto-Applied: ${job.title} @ ${job.company}`, 'raleem811811@gmail.com', 1);

      // Small delay between applications to avoid rate limits
      await new Promise(r => setTimeout(r, 2000));

    } catch (e) {
      db.prepare('UPDATE jobs SET status = ? WHERE id = ? AND status IN (?, ?)').run('NEEDS_REVIEW', job.id, 'New', 'MATCHED');
      await sendAutoApplyNotification(job, 'review', '');
      console.error(`[auto-apply] ❌ Failed for ${job.title}:`, e.message);
    }
  }
}
