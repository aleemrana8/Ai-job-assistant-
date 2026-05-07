"""CV Analysis using LLM — extracts structured profile from raw CV text."""
from app.ai.llm_client import chat_completion_json

SYSTEM_PROMPT = """You are an expert HR analyst and career coach AI. 
Analyze the provided CV/resume text and extract a structured profile.

Return a JSON object with these exact keys:
{
  "full_name": "",
  "email": "",
  "phone": "",
  "linkedin_url": "",
  "portfolio_url": "",
  "github_url": "",
  "summary": "2-3 sentence professional summary",
  "years_of_experience": "e.g. 1-3, 3-5, 5-10",
  "target_seniority": ["Entry", "Mid"],
  "preferred_roles": ["list of ideal job titles"],
  "preferred_locations": ["Remote", "..."],
  "remote_preference": "Remote Only or Hybrid or Flexible",
  "salary_expectations": "",
  "technical_skills": ["skill1", "skill2"],
  "management_skills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],
  "ai_automation": ["if applicable"],
  "soft_skills": ["skill1", "skill2"],
  "certifications": ["cert1"],
  "industries": ["industry1"],
  "domain_expertise": ["area1"],
  "education": [{"degree": "", "institution": "", "year": ""}],
  "experience": [{"role": "", "company": "", "period": "", "highlights": ["..."]}],
  "projects": ["project description"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["area to improve"],
  "ideal_job_titles": ["title1", "title2"],
  "transferable_skills": ["skill1"]
}

Be thorough and accurate. Only include information that is clearly stated or strongly implied in the CV.
Do not fabricate any data."""


async def analyze_cv_with_llm(cv_text: str) -> dict:
    """Analyze CV text with LLM and return structured profile data."""
    user_prompt = f"Analyze this CV and extract the structured profile:\n\n{cv_text[:8000]}"
    result = await chat_completion_json(SYSTEM_PROMPT, user_prompt)
    return result
