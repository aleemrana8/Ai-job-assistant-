"""Centralized OpenAI client."""
from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def chat_completion(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    """Send a chat completion request and return the response text."""
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return response.choices[0].message.content or ""


async def chat_completion_json(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
    """Send a chat completion request and parse JSON response."""
    import json

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    text = response.choices[0].message.content or "{}"
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}
