"""Celery application configuration."""
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "career_agent",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    # Fetch jobs every 5 minutes
    "fetch-jobs-every-5-min": {
        "task": "app.workers.tasks.fetch_jobs_task",
        "schedule": 300.0,  # 5 minutes
    },
    # Match new jobs against profile every 10 minutes
    "match-jobs-every-10-min": {
        "task": "app.workers.tasks.match_new_jobs_task",
        "schedule": 600.0,  # 10 minutes
    },
    # Auto-apply to eligible jobs every 15 minutes
    "auto-apply-every-15-min": {
        "task": "app.workers.tasks.auto_apply_eligible_task",
        "schedule": 900.0,  # 15 minutes
    },
    # Email digest at 2:30 AM
    "email-digest-morning": {
        "task": "app.workers.tasks.send_email_digest_task",
        "schedule": crontab(hour=2, minute=30),
    },
    # Email digest at 2:30 PM
    "email-digest-afternoon": {
        "task": "app.workers.tasks.send_email_digest_task",
        "schedule": crontab(hour=14, minute=30),
    },
}

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.workers"])
