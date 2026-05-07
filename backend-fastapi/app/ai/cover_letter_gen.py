"""AI Cover Letter Generator — produces tailored cover letters."""
from app.ai.llm_client import chat_completion

SYSTEM_PROMPT = """You are a professional cover letter writer. 
Generate a concise, personalized cover letter for the candidate applying to the given job.

Rules:
- Professional but warm tone
- Concise (under 350 words)
- Reference specific skills that match the job
- Mention relevant experience
- Show genuine interest in the role/company
- Include candidate's name and contact info in header
- No generic filler text
- End with a clear call to action

Format:
[Full Name]
[Contact Info Line]
[Date]

Dear Hiring Manager,

[3-4 paragraphs]

Sincerely,
[Name]
[Email] · [Phone]"""


async def generate_cover_letter(job, profile) -> str:
    """Generate a tailored cover letter for a specific job."""
    user_prompt = f"""Generate a cover letter for this application:

JOB:
- Title: {job.title}
- Company: {job.company}
- Location: {job.location}
- Description: {(job.description or 'Remote Project/Product Management role')[:1500]}

CANDIDATE:
- Name: {profile.full_name}
- Email: {profile.email}
- Phone: {profile.phone}
- LinkedIn: {profile.linkedin_url}
- Portfolio: {profile.portfolio_url}
- Summary: {profile.summary}
- Experience: {profile.years_of_experience} years
- Key Skills: {', '.join((profile.management_skills or [])[:6] + (profile.technical_skills or [])[:4])}
- Tools: {', '.join((profile.tools or [])[:6])}
- Industries: {', '.join((profile.industries or [])[:4])}
- Recent Role: {(profile.experience or [{}])[0].get('role', '')} at {(profile.experience or [{}])[0].get('company', '')}
"""

    letter = await chat_completion(SYSTEM_PROMPT, user_prompt, temperature=0.4)
    return letter
