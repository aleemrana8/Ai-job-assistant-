"""Email sending service — SMTP via aiosmtplib."""
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

import aiosmtplib
from jinja2 import Template

from app.core.config import settings


async def _send_email(subject: str, html_body: str, to: str = "") -> bool:
    """Send an email via SMTP."""
    recipient = to or settings.EMAIL_TO
    if not recipient or not settings.SMTP_USER:
        return False

    message = MIMEMultipart("alternative")
    message["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            use_tls=True,
            tls_context=context,
        )
        return True
    except Exception as e:
        print(f"[email] Error sending: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# DIGEST EMAIL
# ═══════════════════════════════════════════════════════════════
DIGEST_TEMPLATE = Template("""
<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: -apple-system, system-ui, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }
.header h1 { margin: 0; font-size: 22px; }
.stats { display: flex; justify-content: space-around; padding: 16px; background: #f8f9fa; }
.stat { text-align: center; }
.stat-num { font-size: 24px; font-weight: bold; color: #667eea; }
.stat-label { font-size: 11px; color: #666; text-transform: uppercase; }
.jobs { padding: 16px; }
.job { border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
.job-title { font-weight: bold; color: #333; }
.job-company { color: #666; font-size: 14px; }
.job-score { display: inline-block; background: {{ '{{' }}'#22c55e' if job.score >= 8 else '#f59e0b'{{ '}}' }}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
.apply-btn { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; }
.footer { padding: 16px; text-align: center; color: #999; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🤖 AI Career Agent — Daily Digest</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">{{ now }}</p>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-num">{{ data.total_jobs }}</div><div class="stat-label">Total Jobs</div></div>
    <div class="stat"><div class="stat-num">{{ data.matched_jobs }}</div><div class="stat-label">Matched</div></div>
    <div class="stat"><div class="stat-num">{{ data.auto_applied }}</div><div class="stat-label">Auto-Applied</div></div>
    <div class="stat"><div class="stat-num">{{ data.needs_review }}</div><div class="stat-label">Review</div></div>
  </div>
  <div class="jobs">
    <h3>🏆 Top Opportunities</h3>
    {% for job in data.top_jobs %}
    <div class="job">
      <div class="job-title">{{ job.title }}</div>
      <div class="job-company">{{ job.company }} · {{ job.source }}</div>
      <div style="margin-top: 6px;">
        <span class="job-score">Score: {{ job.score }}/10</span>
        <span style="margin-left: 8px; color: #666; font-size: 12px;">{{ job.status }}</span>
      </div>
      {% if job.apply_link %}
      <div style="margin-top: 8px;"><a href="{{ job.apply_link }}" class="apply-btn">Apply Now →</a></div>
      {% endif %}
    </div>
    {% endfor %}
  </div>
  <div class="footer">
    AI Career Agent · Automated Job Intelligence<br>
    Next digest at {% if is_morning %}2:30 PM{% else %}2:30 AM{% endif %} UTC
  </div>
</div>
</body>
</html>
""")


async def send_digest_email_sync(digest_data: dict) -> bool:
    """Send the daily digest email."""
    now = datetime.now(timezone.utc)
    is_morning = now.hour < 12

    html = DIGEST_TEMPLATE.render(
        data=digest_data,
        now=now.strftime("%B %d, %Y at %H:%M UTC"),
        is_morning=is_morning,
    )

    subject = f"🚀 {digest_data['total_jobs']} Jobs Tracked | {digest_data['auto_applied']} Applied — Daily Digest"
    return await _send_email(subject, html)


# ═══════════════════════════════════════════════════════════════
# APPLICATION NOTIFICATION
# ═══════════════════════════════════════════════════════════════
async def send_application_notification_sync(job, email_type: str) -> bool:
    """Send email after auto-apply attempt."""
    if email_type == "success":
        subject = f"✅ Auto-Applied: {job.title} @ {job.company}"
        html = f"""
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>✅ Successfully Applied!</h2>
            <p><strong>Title:</strong> {job.title}</p>
            <p><strong>Company:</strong> {job.company}</p>
            <p><strong>Source:</strong> {job.source}</p>
            <p><strong>Score:</strong> {job.score}/10</p>
            <p><strong>Applied at:</strong> {datetime.now(timezone.utc).isoformat()}</p>
            <p><a href="{job.apply_link}">View Job →</a></p>
            <hr>
            <p style="color: #666;">Next steps: Monitor for interview invitations.</p>
        </div>
        """
    else:
        subject = f"❌ Apply Failed: {job.title} @ {job.company}"
        html = f"""
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>❌ Auto-Apply Failed</h2>
            <p><strong>Title:</strong> {job.title}</p>
            <p><strong>Company:</strong> {job.company}</p>
            <p><strong>Source:</strong> {job.source}</p>
            <p><strong>Action Required:</strong> Manual application needed</p>
            <p><a href="{job.apply_link}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Apply Manually →</a></p>
        </div>
        """

    return await _send_email(subject, html)


# ═══════════════════════════════════════════════════════════════
# TEST EMAIL
# ═══════════════════════════════════════════════════════════════
async def send_test_email() -> bool:
    """Send a test email to verify configuration."""
    html = """
    <div style="font-family: sans-serif; padding: 20px; text-align: center;">
        <h2>🤖 AI Career Agent</h2>
        <p>Email configuration is working correctly!</p>
        <p style="color: #666;">You will receive job digests at 2:30 AM and 2:30 PM UTC.</p>
    </div>
    """
    return await _send_email("🤖 AI Career Agent — Test Email", html)
