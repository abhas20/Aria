"""Weekly health summary generation using Gemini."""

from __future__ import annotations

from google import genai
from google.genai import types

from core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def _build_summary_prompt(data: dict, language: str) -> str:
    language_names = {
        "en": "English",
        "hi": "Hindi (हिंदी)",
        "ta": "Tamil (தமிழ்)",
        "te": "Telugu (తెలుగు)",
    }
    lang = language_names.get(language, "English")

    return f"""You are Dr. Aria, a warm AI health companion for Indian women.

Analyse this user's health data from the past 7 days and write a personalised weekly summary.

HEALTH DATA:
- Days mood was logged: {data['mood_days']} / 7
- Average mood score: {data['avg_mood'] or 'not logged'}
- Average energy level: {data['avg_energy'] or 'not logged'}
- Average stress level: {data['avg_stress'] or 'not logged'}
- Most common symptoms: {data['top_symptoms'] or 'none logged'}
- Average sleep hours: {data['avg_sleep'] or 'not logged'}
- Average sleep quality: {data['avg_sleep_quality'] or 'not logged'}
- Total water logged days: {data['water_days']} / 7
- Average daily water intake: {data['avg_water_ml'] or 0} ml
- Meditation sessions: {data['meditation_sessions']}
- Total meditation minutes: {data['total_meditation_minutes']}
- Period active this week: {data['period_active']}

INSTRUCTIONS:
- Write a warm, encouraging 150-word summary in {lang}
- Acknowledge what the user did well this week
- Gently note areas that need attention without being negative
- Be culturally sensitive to Indian context
- Then provide exactly 3 specific, actionable tips based on the data

Respond ONLY as valid JSON in this exact format, no markdown, no extra text:
{{"summary": "your summary here", "tips": ["tip 1", "tip 2", "tip 3"]}}
"""


async def generate_weekly_summary(
    health_data: dict,
    language: str = "en",
) -> tuple[str, list[str]]:
    """Call Gemini to generate a weekly summary.
    
    Returns a tuple of (summary_text, tips_list).
    """
    prompt = _build_summary_prompt(health_data, language)

    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_json_schema={
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "tips": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 3,
                        "maxItems": 3,
                    },
                },
                "required": ["summary", "tips"],
            }
        ),
    )

    import json
    result = json.loads(response.text)
    return result["summary"], result["tips"]