"""SQLAlchemy models — User, UserProfile, Job, Application, CoverLetter, EmailLog, AutomationLog."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship

from app.database.base import Base


def utcnow():
    return datetime.now(timezone.utc)


# ═══════════════════════════════════════════════════════════════
# USER
# ═══════════════════════════════════════════════════════════════
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    applications = relationship("Application", back_populates="user")


# ═══════════════════════════════════════════════════════════════
# USER PROFILE (CV Analysis Result)
# ═══════════════════════════════════════════════════════════════
class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Personal info
    full_name = Column(String(255), default="")
    email = Column(String(255), default="")
    phone = Column(String(50), default="")
    linkedin_url = Column(String(500), default="")
    portfolio_url = Column(String(500), default="")
    github_url = Column(String(500), default="")

    # Professional
    summary = Column(Text, default="")
    years_of_experience = Column(String(20), default="")
    target_seniority = Column(JSON, default=list)  # ["Entry", "Mid"]
    preferred_roles = Column(JSON, default=list)
    preferred_locations = Column(JSON, default=list)
    remote_preference = Column(String(50), default="Remote Only")
    salary_expectations = Column(String(100), default="")

    # Skills & expertise
    technical_skills = Column(JSON, default=list)
    management_skills = Column(JSON, default=list)
    tools = Column(JSON, default=list)
    ai_automation = Column(JSON, default=list)
    soft_skills = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    industries = Column(JSON, default=list)
    domain_expertise = Column(JSON, default=list)

    # Education & experience
    education = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    projects = Column(JSON, default=list)

    # AI-inferred
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    ideal_job_titles = Column(JSON, default=list)
    transferable_skills = Column(JSON, default=list)

    # Raw CV text for re-processing
    cv_raw_text = Column(Text, default="")

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="profile")


# ═══════════════════════════════════════════════════════════════
# JOB
# ═══════════════════════════════════════════════════════════════
class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(500), unique=True, nullable=False, index=True)  # external dedup key
    title = Column(String(500), nullable=False)
    company = Column(String(500), default="")
    location = Column(String(500), default="")
    source = Column(String(50), default="")  # LinkedIn, Indeed
    description = Column(Text, default="")
    apply_link = Column(String(1000), default="")
    posted_at = Column(DateTime(timezone=True), nullable=True)
    salary = Column(String(200), default="")
    employment_type = Column(String(50), default="")

    # AI analysis
    score = Column(Float, default=0.0)
    reason = Column(Text, default="")
    skills_match = Column(JSON, default=list)
    skills_missing = Column(JSON, default=list)
    interview_focus = Column(JSON, default=list)

    # Status
    status = Column(String(30), default="NEW", index=True)
    # NEW, MATCHED, AUTO_APPLIED, NEEDS_REVIEW, FAILED, REJECTED, INTERVIEW, OFFER
    auto_apply_eligible = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    applications = relationship("Application", back_populates="job")
    cover_letter = relationship("CoverLetter", back_populates="job", uselist=False)


# ═══════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════
class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    status = Column(String(30), default="PENDING")
    # PENDING, SUBMITTED, FAILED, NEEDS_REVIEW
    method = Column(String(30), default="AUTO")  # AUTO, MANUAL
    confirmation_text = Column(Text, default="")
    failure_reason = Column(Text, default="")
    applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")


# ═══════════════════════════════════════════════════════════════
# COVER LETTER
# ═══════════════════════════════════════════════════════════════
class CoverLetter(Base):
    __tablename__ = "cover_letters"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), unique=True, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    job = relationship("Job", back_populates="cover_letter")


# ═══════════════════════════════════════════════════════════════
# EMAIL LOG
# ═══════════════════════════════════════════════════════════════
class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    email_type = Column(String(50), nullable=False)  # digest, success, failure
    subject = Column(String(500), default="")
    recipients = Column(String(500), default="")
    job_count = Column(Integer, default=0)
    sent_at = Column(DateTime(timezone=True), default=utcnow)
    success = Column(Boolean, default=True)
    error = Column(Text, default="")


# ═══════════════════════════════════════════════════════════════
# AUTOMATION LOG
# ═══════════════════════════════════════════════════════════════
class AutomationLog(Base):
    __tablename__ = "automation_logs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    action = Column(String(100), nullable=False)
    status = Column(String(30), default="")
    details = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)


# ═══════════════════════════════════════════════════════════════
# DASHBOARD STATS (cached aggregates)
# ═══════════════════════════════════════════════════════════════
class DashboardStats(Base):
    __tablename__ = "dashboard_stats"

    id = Column(Integer, primary_key=True, index=True)
    total_jobs = Column(Integer, default=0)
    matched_jobs = Column(Integer, default=0)
    auto_applied = Column(Integer, default=0)
    needs_review = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), default=utcnow)
