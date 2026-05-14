from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class OnboardingRequest(BaseModel):
    name: str
    date_of_birth: date | None = None
    health_concerns: list[str] = []   # ["pcos", "mental_health"]
    preferred_language: str = "en"


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    date_of_birth: date | None = None
    health_concerns: list[str] | None = None
    preferred_language: str | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    firebase_uid: str
    email: str | None
    name: str | None
    date_of_birth: date | None
    health_concerns: list[str]
    preferred_language: str
    onboarding_complete: bool
    created_at: datetime

    model_config = {"from_attributes": True}