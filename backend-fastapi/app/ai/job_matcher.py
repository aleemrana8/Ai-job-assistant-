"""AI Job Matching — scores jobs against user profile using LLM."""
from app.ai.llm_client import chat_completion_json

SYSTEM_PROMPT = """You are an expert AI career matching engine.
Given a job posting and a candidate profile, analyze the fit.

Return a JSON object:
{
  "score": <integer 1-10>,
  "reason": "Brief explanation of the score",
  "skills_match": ["matched skill 1", "matched skill 2"],
  "skills_missing": ["missing skill 1"],
  "interview_focus": ["likely topic 1", "likely topic 2"],
  "experience_fit": "good/moderate/weak",
  "role_relevance": "high/medium/low"
}

Scoring guidelines:
- 1-4: Weak fit (wrong role, major skill gaps, wrong experience level)
- 5-7: Moderate fit (some overlap, could work with upskilling)
- 8-10: Strong fit (direct match, most skills align, right level)

Consider: role alignment, skill overlap, experience level, remote compatibility, industry match."""


async def match_job_against_profile(job, profile) -> dict:
    """Use LLM to score a job against a user profile."""
    job_info = f"""
JOB TITLE: {job.title}
COMPANY: {job.company}
LOCATION: {job.location}
SOURCE: {job.source}
DESCRIPTION: {(job.description or '')[:2000]}
SALARY: {job.salary}
TYPE: {job.employment_type}
"""

    profile_info = f"""
CANDIDATE: {profile.full_name}
YEARS EXPERIENCE: {profile.years_of_experience}
TARGET ROLES: {', '.join(profile.preferred_roles or [])}
TECHNICAL SKILLS: {', '.join(profile.technical_skills or [])}
MANAGEMENT SKILLS: {', '.join(profile.management_skills or [])}
TOOLS: {', '.join(profile.tools or [])}
AI/AUTOMATION: {', '.join(profile.ai_automation or [])}
INDUSTRIES: {', '.join(profile.industries or [])}
DOMAIN EXPERTISE: {', '.join(profile.domain_expertise or [])}
STRENGTHS: {', '.join(profile.strengths or [])}
REMOTE PREFERENCE: {profile.remote_preference}
TARGET SENIORITY: {', '.join(profile.target_seniority or [])}
"""

    user_prompt = f"Match this job against the candidate profile:\n\n{job_info}\n\n{profile_info}"

    result = await chat_completion_json(SYSTEM_PROMPT, user_prompt)

    # Ensure required fields
    return {
        "score": min(max(int(result.get("score", 5)), 1), 10),
        "reason": result.get("reason", ""),
        "skills_match": result.get("skills_match", []),
        "skills_missing": result.get("skills_missing", []),
        "interview_focus": result.get("interview_focus", []),
    }
