"""Job Fetcher Service — fetches from LinkedIn & Indeed via RapidAPI."""
import re
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from app.core.config import settings

# Role relevance filters
TITLE_MATCH = re.compile(
    r"(project\s*manag|product\s*manag|program\s*manag|scrum\s*master|agile\s*"
    r"manag|technical\s*project|associate\s*product|junior\s*project|ai\s*project)",
    re.IGNORECASE,
)
SENIOR_EXCLUDE = re.compile(
    r"(senior|sr\.|staff|principal|director|head\s+of|vp|chief|c-suite|executive)",
    re.IGNORECASE,
)


def _make_job_id(source: str, title: str, company: str, link: str) -> str:
    """Generate a unique job ID for deduplication."""
    if link:
        return hashlib.md5(link.encode()).hexdigest()
    raw = f"{source}|{title}|{company}".lower()
    return hashlib.md5(raw.encode()).hexdigest()


def _is_valid_job(job: dict) -> bool:
    """Apply strict filtering rules."""
    title = job.get("title", "")
    location = job.get("location", "")

    # Must have title
    if not title:
        return False

    # Must be PM/Product role
    if not TITLE_MATCH.search(title):
        return False

    # Exclude senior roles
    if SENIOR_EXCLUDE.search(title):
        return False

    # Must be remote
    if not re.search(r"remote|worldwide|anywhere|work\s*from\s*home", location + " " + title, re.IGNORECASE):
        return False

    # Must have apply link
    if not job.get("apply_link"):
        return False

    # Must be within 7 days
    posted = job.get("posted_at")
    if posted:
        try:
            posted_dt = datetime.fromisoformat(posted.replace("Z", "+00:00"))
            if posted_dt < datetime.now(timezone.utc) - timedelta(days=7):
                return False
        except (ValueError, TypeError):
            pass

    return True


async def fetch_linkedin_jobs() -> list[dict]:
    """Fetch jobs from LinkedIn via RapidAPI."""
    if not settings.RAPIDAPI_KEY:
        return []

    jobs = []
    queries = [
        "remote project manager",
        "remote product manager",
        "project manager work from home",
        "product manager remote",
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        for query in queries:
            try:
                response = await client.get(
                    "https://linkedin-data-api.p.rapidapi.com/search-jobs",
                    params={"keywords": query, "locationId": "92000000", "sort": "DD"},
                    headers={
                        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                        "X-RapidAPI-Host": "linkedin-data-api.p.rapidapi.com",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("data", []):
                        jobs.append({
                            "title": item.get("title", ""),
                            "company": item.get("company", {}).get("name", ""),
                            "location": item.get("location", ""),
                            "source": "LinkedIn",
                            "description": item.get("description", ""),
                            "apply_link": item.get("url", ""),
                            "posted_at": item.get("postedAt", ""),
                            "salary": item.get("salary", ""),
                            "employment_type": item.get("employmentType", ""),
                        })
            except Exception:
                continue

    return jobs


async def fetch_indeed_jobs() -> list[dict]:
    """Fetch jobs from Indeed via RapidAPI."""
    if not settings.RAPIDAPI_KEY:
        return []

    jobs = []
    queries = [
        "remote project manager",
        "remote product manager",
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        for query in queries:
            try:
                response = await client.get(
                    "https://indeed-indeed.p.rapidapi.com/apisearch",
                    params={
                        "v": "2",
                        "q": query,
                        "l": "remote",
                        "sort": "date",
                        "radius": "0",
                        "jt": "fulltime",
                        "limit": "25",
                    },
                    headers={
                        "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
                        "X-RapidAPI-Host": "indeed-indeed.p.rapidapi.com",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("results", []):
                        jobs.append({
                            "title": item.get("jobtitle", ""),
                            "company": item.get("company", ""),
                            "location": item.get("formattedLocation", ""),
                            "source": "Indeed",
                            "description": item.get("snippet", ""),
                            "apply_link": item.get("url", ""),
                            "posted_at": item.get("date", ""),
                            "salary": "",
                            "employment_type": "Full-time",
                        })
            except Exception:
                continue

    return jobs


async def fetch_all_jobs() -> list[dict]:
    """Fetch from all sources, normalize, filter, and deduplicate."""
    linkedin_jobs = await fetch_linkedin_jobs()
    indeed_jobs = await fetch_indeed_jobs()

    all_raw = linkedin_jobs + indeed_jobs

    # Filter
    valid_jobs = [j for j in all_raw if _is_valid_job(j)]

    # Deduplicate
    seen = set()
    unique_jobs = []
    for job in valid_jobs:
        job_id = _make_job_id(job["source"], job["title"], job["company"], job["apply_link"])
        if job_id not in seen:
            seen.add(job_id)
            job["job_id"] = job_id
            unique_jobs.append(job)

    return unique_jobs
