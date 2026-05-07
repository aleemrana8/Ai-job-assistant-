"""Celery tasks — job fetching, matching, auto-apply, email digests."""
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.workers.celery_app import celery_app
from app.core.config import settings
from app.models import Job, UserProfile, Application, CoverLetter, EmailLog, AutomationLog

# Sync engine for Celery workers (Celery doesn't support async natively)
sync_engine = create_engine(settings.DATABASE_URL_SYNC, pool_size=5)
SyncSession = sessionmaker(sync_engine)


def _run_async(coro):
    """Helper to run async code in sync Celery tasks."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="app.workers.tasks.fetch_jobs_task", bind=True, max_retries=3)
def fetch_jobs_task(self):
    """Fetch jobs from LinkedIn & Indeed, normalize, filter, and store."""
    from app.services.job_fetcher import fetch_all_jobs

    try:
        jobs = _run_async(fetch_all_jobs())

        with SyncSession() as session:
            inserted = 0
            for job_data in jobs:
                # Check if already exists
                existing = session.execute(
                    select(Job).where(Job.job_id == job_data["job_id"])
                ).scalar_one_or_none()

                if not existing:
                    job = Job(
                        job_id=job_data["job_id"],
                        title=job_data["title"],
                        company=job_data.get("company", ""),
                        location=job_data.get("location", ""),
                        source=job_data.get("source", ""),
                        description=job_data.get("description", ""),
                        apply_link=job_data.get("apply_link", ""),
                        posted_at=_parse_date(job_data.get("posted_at")),
                        salary=job_data.get("salary", ""),
                        employment_type=job_data.get("employment_type", ""),
                        status="NEW",
                    )
                    session.add(job)
                    inserted += 1

            session.commit()

            # Log
            log = AutomationLog(
                action="FETCH_JOBS",
                status="SUCCESS",
                details=f"Fetched {len(jobs)} raw, inserted {inserted} new jobs",
            )
            session.add(log)
            session.commit()

        return {"fetched": len(jobs), "inserted": inserted}

    except Exception as exc:
        self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.workers.tasks.match_new_jobs_task")
def match_new_jobs_task():
    """Match all NEW jobs against the user profile using AI."""
    from app.ai.job_matcher import match_job_against_profile

    with SyncSession() as session:
        # Get user profile (first user)
        profile = session.execute(select(UserProfile).limit(1)).scalar_one_or_none()
        if not profile:
            return {"error": "No user profile found"}

        # Get unmatched jobs
        new_jobs = session.execute(
            select(Job).where(Job.status == "NEW").limit(50)
        ).scalars().all()

        matched = 0
        auto_eligible = 0

        for job in new_jobs:
            try:
                result = _run_async(match_job_against_profile(job, profile))
                job.score = result["score"]
                job.reason = result["reason"]
                job.skills_match = result["skills_match"]
                job.skills_missing = result["skills_missing"]
                job.interview_focus = result.get("interview_focus", [])
                job.auto_apply_eligible = result["score"] >= 8

                if result["score"] >= 5:
                    job.status = "MATCHED"

                matched += 1
                if result["score"] >= 8:
                    auto_eligible += 1
            except Exception:
                continue

        session.commit()

    return {"matched": matched, "auto_eligible": auto_eligible}


@celery_app.task(name="app.workers.tasks.auto_apply_eligible_task")
def auto_apply_eligible_task():
    """Auto-apply to all eligible jobs (score >= 8) that haven't been applied to."""
    with SyncSession() as session:
        eligible_jobs = session.execute(
            select(Job).where(
                Job.auto_apply_eligible == True,
                Job.status.in_(["MATCHED", "NEW"]),
            ).limit(5)
        ).scalars().all()

        for job in eligible_jobs:
            # Check if already applied
            existing_app = session.execute(
                select(Application).where(Application.job_id == job.id)
            ).scalar_one_or_none()

            if not existing_app:
                # Trigger individual auto-apply
                auto_apply_task.delay(job.id, 1)  # user_id=1 for single-user system

    return {"triggered": len(eligible_jobs) if eligible_jobs else 0}


@celery_app.task(name="app.workers.tasks.auto_apply_task", bind=True, max_retries=2)
def auto_apply_task(self, job_id: int, user_id: int):
    """Auto-apply to a single job using Playwright browser automation."""
    from app.automation.applicant import apply_to_job

    with SyncSession() as session:
        job = session.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
        profile = session.execute(
            select(UserProfile).where(UserProfile.user_id == user_id)
        ).scalar_one_or_none()

        if not job or not profile:
            return {"error": "Job or profile not found"}

        # Generate cover letter first
        from app.ai.cover_letter_gen import generate_cover_letter
        cover_letter_text = _run_async(generate_cover_letter(job, profile))

        # Save cover letter
        existing_cl = session.execute(
            select(CoverLetter).where(CoverLetter.job_id == job_id)
        ).scalar_one_or_none()
        if not existing_cl:
            cl = CoverLetter(job_id=job_id, content=cover_letter_text)
            session.add(cl)

        # Attempt auto-apply
        try:
            result = _run_async(apply_to_job(job, profile, cover_letter_text))

            app = Application(
                user_id=user_id,
                job_id=job_id,
                status="SUBMITTED" if result["success"] else "FAILED",
                method="AUTO",
                confirmation_text=result.get("confirmation", ""),
                failure_reason=result.get("error", ""),
                applied_at=datetime.now(timezone.utc) if result["success"] else None,
            )
            session.add(app)

            job.status = "AUTO_APPLIED" if result["success"] else "NEEDS_REVIEW"
            session.commit()

            # Send notification email
            if result["success"]:
                send_application_email_task.delay(job_id, "success")
            else:
                send_application_email_task.delay(job_id, "failure")

            # Log
            log = AutomationLog(
                job_id=job_id,
                action="AUTO_APPLY",
                status="SUCCESS" if result["success"] else "FAILED",
                details=result.get("confirmation", result.get("error", "")),
            )
            session.add(log)
            session.commit()

            return result

        except Exception as exc:
            job.status = "NEEDS_REVIEW"
            app = Application(
                user_id=user_id,
                job_id=job_id,
                status="FAILED",
                method="AUTO",
                failure_reason=str(exc),
            )
            session.add(app)
            session.commit()

            send_application_email_task.delay(job_id, "failure")
            return {"success": False, "error": str(exc)}


@celery_app.task(name="app.workers.tasks.send_email_digest_task")
def send_email_digest_task():
    """Send daily email digest with job summary."""
    from app.emails.sender import send_digest_email_sync

    with SyncSession() as session:
        from sqlalchemy import func

        total = session.execute(select(func.count(Job.id))).scalar() or 0
        matched = session.execute(
            select(func.count(Job.id)).where(Job.status == "MATCHED")
        ).scalar() or 0
        auto_applied = session.execute(
            select(func.count(Job.id)).where(Job.status == "AUTO_APPLIED")
        ).scalar() or 0
        needs_review = session.execute(
            select(func.count(Job.id)).where(Job.status == "NEEDS_REVIEW")
        ).scalar() or 0

        top_jobs = session.execute(
            select(Job).order_by(Job.score.desc()).limit(10)
        ).scalars().all()

        digest_data = {
            "total_jobs": total,
            "matched_jobs": matched,
            "auto_applied": auto_applied,
            "needs_review": needs_review,
            "top_jobs": [
                {
                    "title": j.title,
                    "company": j.company,
                    "score": j.score,
                    "source": j.source,
                    "apply_link": j.apply_link,
                    "status": j.status,
                }
                for j in top_jobs
            ],
        }

        result = _run_async(send_digest_email_sync(digest_data))

        # Log email
        log = EmailLog(
            email_type="digest",
            subject=f"Daily Digest - {total} jobs tracked",
            recipients=settings.EMAIL_TO,
            job_count=len(top_jobs),
            success=result,
        )
        session.add(log)
        session.commit()

    return {"sent": result}


@celery_app.task(name="app.workers.tasks.send_application_email_task")
def send_application_email_task(job_id: int, email_type: str):
    """Send email notification after auto-apply attempt."""
    from app.emails.sender import send_application_notification_sync

    with SyncSession() as session:
        job = session.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
        if not job:
            return

        _run_async(send_application_notification_sync(job, email_type))

        log = EmailLog(
            email_type=email_type,
            subject=f"{'✅' if email_type == 'success' else '❌'} {job.title} @ {job.company}",
            recipients=settings.EMAIL_TO,
            job_count=1,
            success=True,
        )
        session.add(log)
        session.commit()


def _parse_date(date_str) -> datetime | None:
    """Parse various date formats."""
    if not date_str:
        return None
    try:
        if isinstance(date_str, datetime):
            return date_str
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
