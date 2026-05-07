"""API Router — aggregates all sub-routers."""
from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.profile import router as profile_router
from app.api.jobs import router as jobs_router
from app.api.applications import router as applications_router
from app.api.dashboard import router as dashboard_router
from app.api.email_api import router as email_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["Auth"])
router.include_router(profile_router, prefix="/profile", tags=["Profile"])
router.include_router(jobs_router, prefix="/jobs", tags=["Jobs"])
router.include_router(applications_router, prefix="/applications", tags=["Applications"])
router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(email_router, prefix="/email", tags=["Email"])
