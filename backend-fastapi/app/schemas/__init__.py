"""Pydantic schemas for request/response validation."""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ═══════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════
class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ═══════════════════════════════════════════════════════════════
# USER PROFILE
# ═══════════════════════════════════════════════════════════════
class ProfileResponse(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    linkedin_url: str = ""
    portfolio_url: str = ""
    github_url: str = ""
    summary: str = ""
    years_of_experience: str = ""
    target_seniority: list[str] = []
    preferred_roles: list[str] = []
    preferred_locations: list[str] = []
    remote_preference: str = ""
    salary_expectations: str = ""
    technical_skills: list[str] = []
    management_skills: list[str] = []
    tools: list[str] = []
    ai_automation: list[str] = []
    soft_skills: list[str] = []
    certifications: list[str] = []
    industries: list[str] = []
    domain_expertise: list[str] = []
    education: list[dict] = []
    experience: list[dict] = []
    projects: list[str] = []
    strengths: list[str] = []
    weaknesses: list[str] = []
    ideal_job_titles: list[str] = []
    transferable_skills: list[str] = []

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    preferred_roles: Optional[list[str]] = None
    remote_preference: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
# JOB
# ═══════════════════════════════════════════════════════════════
class JobResponse(BaseModel):
    id: int
    job_id: str
    title: str
    company: str
    location: str
    source: str
    description: str = ""
    apply_link: str
    posted_at: Optional[datetime] = None
    salary: str = ""
    employment_type: str = ""
    score: float = 0.0
    reason: str = ""
    skills_match: list[str] = []
    skills_missing: list[str] = []
    interview_focus: list[str] = []
    status: str = "NEW"
    auto_apply_eligible: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class JobStatusUpdate(BaseModel):
    status: str


# ═══════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════
class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    status: str
    method: str
    confirmation_text: str = ""
    failure_reason: str = ""
    applied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════════════
# COVER LETTER
# ═══════════════════════════════════════════════════════════════
class CoverLetterResponse(BaseModel):
    job_id: int
    title: str
    company: str
    content: str


# ═══════════════════════════════════════════════════════════════
# DASHBOARD / ANALYTICS
# ═══════════════════════════════════════════════════════════════
class DashboardResponse(BaseModel):
    total_jobs: int = 0
    matched_jobs: int = 0
    auto_applied: int = 0
    needs_review: int = 0
    failed: int = 0
    avg_score: float = 0.0
    top_jobs: list[JobResponse] = []
    recent_applications: list[ApplicationResponse] = []


class AnalyticsResponse(BaseModel):
    total_jobs: int = 0
    matched_jobs: int = 0
    auto_applied: int = 0
    success_rate: float = 0.0
    failed: int = 0
    needs_review: int = 0
    by_source: dict = {}
    by_status: dict = {}


# ═══════════════════════════════════════════════════════════════
# GENERIC
# ═══════════════════════════════════════════════════════════════
class SuccessResponse(BaseModel):
    ok: bool = True
    message: str = ""


class MatchAllResponse(BaseModel):
    ok: bool = True
    total: int = 0
    matched: int = 0
    auto_apply_eligible: int = 0
