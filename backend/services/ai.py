from __future__ import annotations

from google import genai
from google.genai import types
from core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# ---------------------------------------------------------------------------
# Safety keywords
# ---------------------------------------------------------------------------

SAFETY_KEYWORDS = [
    # Physical emergencies
    "chest pain", "heart attack", "can't breathe", "cannot breathe",
    "severe bleeding", "unconscious", "stroke", "seizure", "overdose",
    # Mental health emergencies
    "suicidal", "suicide", "kill myself", "end my life", "want to die",
    "self harm", "self-harm", "cutting myself",
    # Hindi equivalents
    "खुदकुशी", "आत्महत्या", "मरना चाहती", "सीने में दर्द",
]

SAFETY_MESSAGE_EN = (
    "🚨 **Please seek immediate help.** "
    "If you or someone else is in danger, call **112** (India emergency) "
)

SAFETY_MESSAGE_HI = (
    "🚨 **कृपया तुरंत सहायता लें।** "
    "अगर आप या कोई और खतरे में है, अभी **112** (आपातकाल) "
)

DISCLAIMER_EN = (
    "\n\n---\n"
    "*Dr. Aria provides general health information only — not medical advice. "
    "Always consult a qualified doctor for diagnosis or treatment.*"
)

DISCLAIMER_HI = (
    "\n\n---\n"
    "*डॉ. एरिया केवल सामान्य स्वास्थ्य जानकारी प्रदान करती है — यह चिकित्सीय सलाह नहीं है। "
    "निदान या उपचार के लिए हमेशा किसी योग्य डॉक्टर से परामर्श करें।*"
)

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
    "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)",
    "mr": "Marathi (मराठी)",
    "bn": "Bengali (বাংলা)",
}

HEALTH_CONCERN_CONTEXT = {
    "pcos": (
        "The user has PCOS (polycystic ovary syndrome). "
        "Focus on hormonal balance, insulin resistance, diet (low GI foods, anti-inflammatory), "
        "stress management, and cycle regularity. "
        "Be sensitive to weight-related topics — never shame, always empower."
    ),
    "menopause": (
        "The user is experiencing menopause or perimenopause. "
        "Normalise symptoms (hot flashes, mood changes, sleep issues, vaginal dryness). "
        "Provide evidence-based support. Discuss lifestyle, phytoestrogens, and when to see a doctor."
    ),
    "mental_health": (
        "The user is dealing with mental health challenges. "
        "Be especially warm and non-judgmental. Validate emotions before giving advice. "
        "Recommend professional help gently. Watch for crisis signals."
    ),
    "general": (
        "The user is focused on general wellness and preventive health."
    ),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_system_prompt(
    health_concerns: list[str],
    preferred_language: str,
    weekly_summary: str | None = None,
) -> str:
    language_name = LANGUAGE_NAMES.get(preferred_language, "English")

    health_context_parts = [
        HEALTH_CONCERN_CONTEXT[c]
        for c in health_concerns
        if c in HEALTH_CONCERN_CONTEXT
    ] or [HEALTH_CONCERN_CONTEXT["general"]]
    health_context = "\n".join(health_context_parts)

    prompt = f"""You are Dr. Aria, a warm and knowledgeable AI health companion for Indian women.

LANGUAGE RULE — CRITICAL:
Always respond in {language_name}. Even if the user writes in another language, always reply in {language_name}.
If {language_name} is not English, use simple, conversational {language_name} — not overly formal.

USER HEALTH PROFILE:
{health_context}
"""
    if weekly_summary:
        prompt += f"""
RECENT HEALTH CONTEXT (from user's health log):
{weekly_summary}
Reference this naturally in your responses when relevant.
"""
    prompt += """
GUIDELINES:
- Be warm, empathetic, and non-judgmental at all times
- Be culturally sensitive to the Indian context
- Keep responses concise (under 200 words) unless the user asks for more detail
- Use simple language — avoid medical jargon unless explaining it
- NEVER diagnose. You provide information and guidance only.
- For acute, severe, or emergency symptoms — ALWAYS tell the user to seek immediate care
- Acknowledge emotions before giving advice in mental health conversations

FORBIDDEN:
- Never make definitive diagnoses
- Never recommend specific prescription medications by name
- Never dismiss or minimise the user's symptoms or feelings
"""
    return prompt


def _build_history(messages: list[dict]) -> list[types.Content]:
    """Convert DB messages to new SDK Content format."""
    return [
        types.Content(
            role=msg["role"],  # "user" or "model"
            parts=[types.Part(text=msg["content"])]
        )
        for msg in messages
    ]


def _detect_safety_keywords(message: str) -> bool:
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in SAFETY_KEYWORDS)


def _get_safety_message(language: str) -> str:
    return SAFETY_MESSAGE_HI if language == "hi" else SAFETY_MESSAGE_EN


def _get_disclaimer(language: str) -> str:
    return DISCLAIMER_HI if language == "hi" else DISCLAIMER_EN


# ---------------------------------------------------------------------------
# Main service function
# ---------------------------------------------------------------------------

async def get_aria_response(
    user_message: str,
    history: list[dict],
    health_concerns: list[str],
    preferred_language: str,
    weekly_summary: str | None = None,
) -> str:
    """Get Dr. Aria's response with safety checks, disclaimer, and language enforcement."""

    system_prompt = _build_system_prompt(
        health_concerns=health_concerns,
        preferred_language=preferred_language,
        weekly_summary=weekly_summary,
    )

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
    )

    # Use client.aio for async — this is the new SDK's async interface
    chat = client.aio.chats.create(
        model=settings.GEMINI_MODEL,
        history=_build_history(history),
        config=config,
    )

    response = await chat.send_message(user_message)
    reply = response.text

    # Append disclaimer
    reply += _get_disclaimer(preferred_language)

    # Prepend safety message if emergency keywords detected
    if _detect_safety_keywords(user_message):
        reply = _get_safety_message(preferred_language) + reply

    return reply