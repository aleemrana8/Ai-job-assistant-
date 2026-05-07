"""Dashboard & analytics endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models import Job, Application
from app.schemas import DashboardResponse, AnalyticsResponse, JobResponse, ApplicationResponse

router = APIRouter()


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """Full dashboard overview."""
    total = (await db.execute(select(func.count(Job.id)))).scalar() or 0
    matched = (await db.execute(select(func.count(Job.id)).where(Job.status == "MATCHED"))).scalar() or 0
    auto_applied = (await db.execute(select(func.count(Job.id)).where(Job.status == "AUTO_APPLIED"))).scalar() or 0
    needs_review = (await db.execute(select(func.count(Job.id)).where(Job.status == "NEEDS_REVIEW"))).scalar() or 0
    failed = (await db.execute(select(func.count(Job.id)).where(Job.status == "FAILED"))).scalar() or 0
    avg_score_result = (await db.execute(select(func.avg(Job.score)))).scalar()
    avg_score = round(avg_score_result, 1) if avg_score_result else 0.0

    # Top jobs
    top_result = await db.execute(select(Job).order_by(Job.score.desc()).limit(10))
    top_jobs = top_result.scalars().all()

    # Recent applications
    apps_result = await db.execute(select(Application).order_by(Application.created_at.desc()).limit(10))
    recent_apps = apps_result.scalars().all()

    return DashboardResponse(
        total_jobs=total,
        matched_jobs=matched,
        auto_applied=auto_applied,
        needs_review=needs_review,
        failed=failed,
        avg_score=avg_score,
        top_jobs=top_jobs,
        recent_applications=recent_apps,
    )


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Detailed analytics."""
    total = (await db.execute(select(func.count(Job.id)))).scalar() or 0
    matched = (await db.execute(select(func.count(Job.id)).where(Job.score >= 5))).scalar() or 0
    auto_applied = (await db.execute(select(func.count(Job.id)).where(Job.status == "AUTO_APPLIED"))).scalar() or 0
    failed = (await db.execute(select(func.count(Job.id)).where(Job.status == "FAILED"))).scalar() or 0
    needs_review = (await db.execute(select(func.count(Job.id)).where(Job.status == "NEEDS_REVIEW"))).scalar() or 0

    # By source
    source_result = await db.execute(
        select(Job.source, func.count(Job.id)).group_by(Job.source)
    )
    by_source = {row[0]: row[1] for row in source_result.all()}

    # By status
    status_result = await db.execute(
        select(Job.status, func.count(Job.id)).group_by(Job.status)
    )
    by_status = {row[0]: row[1] for row in status_result.all()}

    success_rate = (auto_applied / total * 100) if total > 0 else 0.0

    return AnalyticsResponse(
        total_jobs=total,
        matched_jobs=matched,
        auto_applied=auto_applied,
        success_rate=round(success_rate, 1),
        failed=failed,
        needs_review=needs_review,
        by_source=by_source,
        by_status=by_status,
    )
