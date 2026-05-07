import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send mobile-friendly email digest with complete job details + direct apply links
 */
export async function sendDigest(emailJobs) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
    return { sent: false, reason: 'SMTP not configured' };
  }

  if (!emailJobs || emailJobs.length === 0) {
    console.log('[email] No jobs to send in digest.');
    return { sent: false, reason: 'No jobs' };
  }

  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' });

  const text = [
    `🚀 Remote PM & Product Jobs - ${now}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Found ${emailJobs.length} top jobs for you:\n`,
    ...emailJobs.map((j, i) => [
      `${i + 1}. ${j.title}`,
      `   🏢 ${j.company}`,
      `   📍 ${j.location || 'Remote'} | 🔗 ${j.source} | ⭐ ${j.score}/10`,
      `   📅 Posted: ${j.posted_at || 'Recent'}`,
      j.summary ? `   📝 ${j.summary}` : '',
      `   👉 APPLY: ${j.apply_link}`,
      '',
    ].filter(Boolean).join('\n')),
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'Good luck! Apply directly from your phone. 📱',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 16px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 13px; }
    .job-card { border-bottom: 1px solid #eee; padding: 16px 20px; }
    .job-card:last-child { border-bottom: none; }
    .job-num { color: #667eea; font-weight: bold; font-size: 14px; }
    .job-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 4px 0; }
    .job-company { font-size: 14px; color: #444; margin: 2px 0; }
    .job-meta { font-size: 12px; color: #888; margin: 6px 0; }
    .job-summary { font-size: 13px; color: #555; margin: 8px 0; line-height: 1.4; }
    .apply-btn { display: inline-block; background: #667eea; color: white !important; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 8px 0; }
    .apply-btn:hover { background: #5a6fd6; }
    .score { background: #f0f4ff; color: #667eea; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .footer { padding: 16px 20px; text-align: center; color: #999; font-size: 12px; background: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Remote PM & Product Jobs</h1>
      <p>${now} • ${emailJobs.length} new matches</p>
    </div>
    ${emailJobs.map((j, i) => `
    <div class="job-card">
      <span class="job-num">#${i + 1}</span> <span class="score">⭐ ${j.score}/10</span>
      <div class="job-title">${j.title}</div>
      <div class="job-company">🏢 ${j.company}</div>
      <div class="job-meta">📍 ${j.location || 'Remote'} • 🔗 ${j.source} • 📅 ${j.posted_at || 'Recent'}</div>
      ${j.summary ? `<div class="job-summary">${j.summary}</div>` : ''}
      <a href="${j.apply_link}" class="apply-btn">Apply Now →</a>
    </div>`).join('')}
    <div class="footer">
      <p>Tap "Apply Now" to open the application directly on your phone 📱</p>
      <p>Jobs fetched from LinkedIn & Indeed only</p>
    </div>
  </div>
</body>
</html>`;

  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER;
  const mailTo = 'raleem811811@gmail.com';

  try {
    await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      subject: `🚀 ${emailJobs.length} Remote PM/Product Jobs - Apply Now`,
      text,
      html,
    });
    console.log(`[email] ✅ Digest sent to ${mailTo} with ${emailJobs.length} jobs`);
    return { sent: true, to: mailTo, jobs: emailJobs.length };
  } catch (e) {
    console.error('[email] ❌ Failed to send:', e.message);
    return { sent: false, reason: e.message };
  }
}

/**
 * Send immediate notification when a high-score job is auto-applied or ready
 * Includes full LLM analysis details: strategy, selling points, concerns, confidence
 */
export async function sendAutoApplyNotification(job, status = 'success', coverLetterPreview = '', llmAnalysis = null) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return { sent: false };

  const mailTo = 'raleem811811@gmail.com';
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER;
  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' });

  const isSuccess = status === 'success';
  const subject = isSuccess
    ? `✅ Auto-Applied: ${job.title} @ ${job.company} (Score ${job.score}/10)`
    : `⚠️ Needs Review: ${job.title} @ ${job.company}`;

  // Build LLM analysis section if available
  const llmSection = llmAnalysis ? `
    <div class="section">
      <div class="section-title">🤖 OpenAI LLM Deep Analysis</div>
      <div class="row"><span class="label">AI Confidence:</span> <span class="value"><strong style="color:${llmAnalysis.confidence === 'high' ? '#16a34a' : llmAnalysis.confidence === 'medium' ? '#ca8a04' : '#dc2626'}">${(llmAnalysis.confidence || 'N/A').toUpperCase()}</strong></span></div>
      <div class="row"><span class="label">AI Decision:</span> <span class="value">${llmAnalysis.recommended_action === 'auto_apply' ? '✅ Auto Apply' : llmAnalysis.recommended_action === 'review' ? '⚠️ Review' : '⏭️ Skip'}</span></div>
      <div class="row"><span class="label">Match Reason:</span> <span class="value">${llmAnalysis.match_reason || 'N/A'}</span></div>
      ${llmAnalysis.application_strategy ? `<div class="row"><span class="label">Strategy:</span> <span class="value">${llmAnalysis.application_strategy}</span></div>` : ''}
      ${llmAnalysis.key_selling_points && llmAnalysis.key_selling_points.length > 0 ? `
      <div style="margin-top:8px"><span class="label">Key Selling Points:</span></div>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:#1a1a2e">
        ${llmAnalysis.key_selling_points.map(p => `<li>${p}</li>`).join('')}
      </ul>` : ''}
      ${llmAnalysis.potential_concerns && llmAnalysis.potential_concerns.length > 0 ? `
      <div style="margin-top:8px"><span class="label">Potential Concerns:</span></div>
      <ul style="margin:4px 0;padding-left:20px;font-size:13px;color:#856404">
        ${llmAnalysis.potential_concerns.map(c => `<li>${c}</li>`).join('')}
      </ul>` : ''}
    </div>` : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body { font-family: -apple-system, sans-serif; margin: 0; padding: 16px; background: #f5f5f5; }
.card { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.header { background: ${isSuccess ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #f59e0b, #d97706)'}; color: white; padding: 24px; text-align: center; }
.header h2 { margin: 0; font-size: 20px; }
.header p { margin: 6px 0 0; opacity: 0.9; font-size: 13px; }
.body { padding: 24px; }
.section { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.section:last-child { border-bottom: none; }
.section-title { font-size: 12px; text-transform: uppercase; color: #999; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 10px; }
.row { margin: 8px 0; font-size: 14px; display: flex; }
.label { color: #666; font-weight: 600; min-width: 120px; }
.value { color: #1a1a2e; flex: 1; }
.score { display: inline-block; background: ${job.score >= 8 ? '#dcfce7' : '#fef9c3'}; color: ${job.score >= 8 ? '#16a34a' : '#ca8a04'}; padding: 3px 12px; border-radius: 12px; font-weight: bold; font-size: 13px; }
.skills { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.skill-tag { background: #f0f4ff; color: #667eea; padding: 3px 8px; border-radius: 6px; font-size: 12px; }
.missing-tag { background: #fff3cd; color: #856404; padding: 3px 8px; border-radius: 6px; font-size: 12px; }
.apply-btn { display: block; text-align: center; background: #667eea; color: white !important; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 700; margin-top: 20px; font-size: 15px; }
.cover-letter { background: #f8f9fa; padding: 14px; border-radius: 8px; font-size: 13px; color: #444; margin-top: 8px; white-space: pre-line; line-height: 1.5; border-left: 3px solid #667eea; }
.footer { padding: 14px 24px; background: #fafafa; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; }
.cv-info { background: #f0fdf4; padding: 10px 14px; border-radius: 8px; font-size: 13px; color: #166534; margin-top: 8px; }
.process-steps { background: #f8f0ff; padding: 12px 14px; border-radius: 8px; font-size: 13px; color: #5b21b6; margin-top: 10px; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h2>${isSuccess ? '✅ Job Auto-Applied Successfully' : '⚠️ Manual Review Required'}</h2>
    <p>${now}</p>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-title">📋 Job Details</div>
      <div class="row"><span class="label">Role:</span> <span class="value"><strong>${job.title}</strong></span></div>
      <div class="row"><span class="label">Company:</span> <span class="value">${job.company}</span></div>
      <div class="row"><span class="label">Location:</span> <span class="value">${job.location || 'Remote'}</span></div>
      <div class="row"><span class="label">Source:</span> <span class="value">${job.source || 'LinkedIn'}</span></div>
      <div class="row"><span class="label">Posted:</span> <span class="value">${job.posted_at || job.date || 'Recent'}</span></div>
      <div class="row"><span class="label">Match Score:</span> <span class="score">${job.score}/10</span></div>
      <div class="row"><span class="label">Job Link:</span> <span class="value"><a href="${job.link || job.apply_link}" style="color:#667eea">${job.link || job.apply_link || 'N/A'}</a></span></div>
    </div>

    ${llmSection}

    <div class="section">
      <div class="section-title">🎯 Skills Analysis</div>
      <div class="row"><span class="label">Why Matched:</span> <span class="value">${job.reason || 'Direct role match with your profile'}</span></div>
      ${job.skills_match ? `<div style="margin-top:8px"><span class="label">Skills Match:</span></div><div class="skills">${(typeof job.skills_match === 'string' ? job.skills_match : '').split(',').filter(Boolean).map(s => `<span class="skill-tag">${s.trim()}</span>`).join('')}</div>` : ''}
      ${job.skills_missing ? `<div style="margin-top:8px"><span class="label">Skills Gap:</span></div><div class="skills">${(typeof job.skills_missing === 'string' ? job.skills_missing : '').split(',').filter(Boolean).map(s => `<span class="missing-tag">${s.trim()}</span>`).join('')}</div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">📄 Application Details</div>
      <div class="row"><span class="label">Status:</span> <span class="value">${isSuccess ? '<strong style="color:#16a34a">AUTO_APPLIED ✅</strong>' : '<strong style="color:#d97706">NEEDS_REVIEW ⚠️</strong>'}</span></div>
      <div class="row"><span class="label">Applied At:</span> <span class="value">${now}</span></div>
      <div class="cv-info">
        <strong>📎 CV Attached:</strong> Rana Muhammad Aleem Akhtar — Technical Project Manager<br>
        <strong>📝 Cover Letter:</strong> ${isSuccess ? 'AI-Generated & tailored by OpenAI GPT-4o-mini' : 'Pending (manual apply needed)'}<br>
        <strong>🤖 LLM Model:</strong> GPT-4o-mini (OpenAI)
      </div>
      <div class="process-steps">
        <strong>🔄 What the system did:</strong><br>
        1. Fetched job from ${job.source || 'LinkedIn'}<br>
        2. ${llmAnalysis ? 'Deep LLM analysis with OpenAI GPT-4o-mini' : 'Profile-based scoring engine'}<br>
        3. Scored ${job.score}/10 match against your CV<br>
        4. Generated tailored cover letter${llmAnalysis ? ' using AI' : ''}<br>
        5. ${isSuccess ? 'Marked as AUTO_APPLIED — ready to submit on portal' : 'Flagged for manual review'}<br>
        6. Sent this notification email with full details
      </div>
    </div>

    ${coverLetterPreview ? `
    <div class="section">
      <div class="section-title">📝 AI-Generated Cover Letter</div>
      <div class="cover-letter">${coverLetterPreview.slice(0, 800)}</div>
    </div>` : ''}

    <a href="${job.link || job.apply_link}" class="apply-btn">🔗 View Job Details & Apply →</a>
  </div>
  <div class="footer">
    🤖 AI Career Agent (OpenAI GPT-4o-mini) • Auto-applied at ${now}<br>
    Next digest: 2:30 AM & 2:30 PM PKT • Dashboard: localhost:5173
  </div>
</div>
</body>
</html>`;

  try {
    await transporter.sendMail({ from: mailFrom, to: mailTo, subject, html });
    console.log(`[email] ✅ ${status} notification sent for: ${job.title} @ ${job.company}`);
    return { sent: true };
  } catch (e) {
    console.error(`[email] ❌ Notification failed:`, e.message);
    return { sent: false, reason: e.message };
  }
}
