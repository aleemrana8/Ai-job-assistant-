"""Jobs endpoints — list, match, score, cover letter."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models import Job, CoverLetter, UserProfile
from app.schemas import JobResponse, JobStatusUpdate, SuccessResponse, MatchAllResponse, CoverLetterResponse
from app.core.security import get_current_user_id
from app.ai.job_matcher import match_job_against_profile
from app.ai.cover_letter_gen import generate_cover_letter

router = APIRouter()


@router.get("/", response_model=list[JobResponse])
async def list_jobs(
    status: str | None = None,
    source: str | None = None,
    min_score: float | None = None,
    search: str | None = None,
    limit: int = Query(default=200, le=1000),
    db: AsyncSession = Depends(get_db),
):
    query = select(Job)
    if status:
        query = query.where(Job.status == status)
    if source:
        query = query.where(Job.source == source)
    if min_score is not None:
        query = query.where(Job.score >= min_score)
    if search:
        query = query.where(
            Job.title.ilike(f"%{search}%") | Job.company.ilike(f"%{search}%")
        )
    query = query.order_by(Job.score.desc(), Job.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}/status", response_model=SuccessResponse)
async def update_job_status(
    job_id: int,
    body: JobStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = body.status
    return SuccessResponse(message=f"Status updated to {body.status}")


@router.post("/match-all", response_model=MatchAllResponse)
async def match_all_jobs(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Re-score all jobs against user profile using LLM matching."""
    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=400, detail="Upload your CV first")

    jobs_result = await db.execute(select(Job).limit(500))
    jobs = jobs_result.scalars().all()

    matched = 0
    auto_eligible = 0

    for job in jobs:
        try:
            result = await match_job_against_profile(job, profile)
            job.score = result["score"]
            job.reason = result["reason"]
            job.skills_match = result["skills_match"]
            job.skills_missing = result["skills_missing"]
            job.interview_focus = result.get("interview_focus", [])
            job.auto_apply_eligible = result["score"] >= 8
            if job.status == "NEW" and result["score"] >= 5:
                job.status = "MATCHED"
            matched += 1
            if result["score"] >= 8:
                auto_eligible += 1
        except Exception:
            continue

    return MatchAllResponse(total=len(jobs), matched=matched, auto_apply_eligible=auto_eligible)


@router.get("/{job_id}/cover-letter", response_model=CoverLetterResponse)
async def get_cover_letter(
    job_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Generate or retrieve a cover letter for a job."""
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Check existing
    cl_result = await db.execute(select(CoverLetter).where(CoverLetter.job_id == job_id))
    existing = cl_result.scalar_one_or_none()
    if existing:
        return CoverLetterResponse(job_id=job.id, title=job.title, company=job.company, content=existing.content)

    # Generate new
    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=400, detail="Upload your CV first")

    content = await generate_cover_letter(job, profile)

    cl = CoverLetter(job_id=job.id, content=content)
    db.add(cl)
    await db.flush()

    return CoverLetterResponse(job_id=job.id, title=job.title, company=job.company, content=content)


@router.post("/refresh", response_model=SuccessResponse)
async def refresh_jobs(db: AsyncSession = Depends(get_db)):
    """Trigger immediate job fetch from LinkedIn & Indeed."""
    from app.workers.tasks import fetch_jobs_task
    fetch_jobs_task.delay()
    return SuccessResponse(message="Job fetch triggered. Results will appear shortly.")
