"""AI Application Question Answerer — handles custom form questions."""
from app.ai.llm_client import chat_completion

SYSTEM_PROMPT = """You are an AI assistant helping a job applicant answer application questions.

Rules:
- Use the candidate's real profile data
- Be concise and professional
- Never fabricate experience or qualifications
- If unsure, give a safe honest answer
- Keep answers under 200 words unless the question requires more
- Be specific where possible, referencing actual skills and experience"""


async def answer_application_question(question: str, profile) -> str:
    """Generate an answer to a custom application question."""
    user_prompt = f"""Answer this job application question for the candidate:

QUESTION: {question}

CANDIDATE PROFILE:
- Name: {profile.full_name}
- Experience: {profile.years_of_experience} years
- Skills: {', '.join((profile.management_skills or [])[:5] + (profile.technical_skills or [])[:5])}
- Tools: {', '.join((profile.tools or [])[:5])}
- Industries: {', '.join((profile.industries or [])[:3])}
- Remote Preference: {profile.remote_preference}
- Summary: {profile.summary}

Provide a professional, honest answer."""

    return await chat_completion(SYSTEM_PROMPT, user_prompt, temperature=0.3)
