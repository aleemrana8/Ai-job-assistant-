"""Profile endpoints — CV upload & profile management."""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models import UserProfile
from app.schemas import ProfileResponse, ProfileUpdate, SuccessResponse
from app.core.security import get_current_user_id
from app.services.cv_parser import parse_cv_file
from app.ai.cv_analyzer import analyze_cv_with_llm

router = APIRouter()


@router.get("/", response_model=ProfileResponse)
async def get_profile(user_id: int = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Upload your CV first.")
    return profile


@router.post("/upload-cv", response_model=ProfileResponse)
async def upload_cv(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Upload CV (PDF or DOCX). The system analyzes it with AI and builds your profile."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    content = await file.read()
    cv_text = parse_cv_file(content, ext)

    if len(cv_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Could not extract meaningful text from CV")

    # Send to LLM for analysis
    profile_data = await analyze_cv_with_llm(cv_text)

    # Upsert profile
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    existing = result.scalar_one_or_none()

    if existing:
        for key, value in profile_data.items():
            if hasattr(existing, key) and value:
                setattr(existing, key, value)
        existing.cv_raw_text = cv_text
        profile = existing
    else:
        profile = UserProfile(user_id=user_id, cv_raw_text=cv_text, **profile_data)
        db.add(profile)

    await db.flush()
    await db.refresh(profile)
    return profile


@router.patch("/", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    await db.flush()
    await db.refresh(profile)
    return profile
