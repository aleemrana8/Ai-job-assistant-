"""Application tracking endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models import Application, Job
from app.schemas import ApplicationResponse, SuccessResponse
from app.core.security import get_current_user_id
from datetime import datetime, timezone

router = APIRouter()


@router.get("/", response_model=list[ApplicationResponse])
async def list_applications(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application)
        .where(Application.user_id == user_id)
        .order_by(Application.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.post("/{job_id}/apply", response_model=SuccessResponse)
async def mark_applied(
    job_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Mark a job as manually applied."""
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check duplicate
    existing = await db.execute(
        select(Application).where(Application.user_id == user_id, Application.job_id == job_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already applied to this job")

    app = Application(
        user_id=user_id,
        job_id=job_id,
        status="SUBMITTED",
        method="MANUAL",
        applied_at=datetime.now(timezone.utc),
    )
    db.add(app)
    job.status = "AUTO_APPLIED"
    await db.flush()

    return SuccessResponse(message="Application recorded")


@router.post("/{job_id}/auto-apply", response_model=SuccessResponse)
async def trigger_auto_apply(
    job_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Trigger automated apply via Playwright for a specific job."""
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.auto_apply_eligible:
        raise HTTPException(status_code=400, detail="Job not eligible for auto-apply (score < 8)")

    from app.workers.tasks import auto_apply_task
    auto_apply_task.delay(job_id, user_id)

    return SuccessResponse(message="Auto-apply triggered. You will be notified of the result.")
