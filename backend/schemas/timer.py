"""Pydantic schemas for timer endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Workout plan (static data — no DB)
# ---------------------------------------------------------------------------

class WorkoutPlanSchema(BaseModel):
    id: str
    name: str
    mode: str  # "hiit" | "tabata" | "custom"
    work_duration_seconds: int
    rest_duration_seconds: int
    round_count: int
    description: str


# ---------------------------------------------------------------------------
# Complete session request / response
# ---------------------------------------------------------------------------

class TimerCompleteRequest(BaseModel):
    mode: str
    plan_name: Optional[str] = None
    duration_seconds: int
    round_count: int


class TimerSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mode: str
    plan_name: Optional[str]
    duration_seconds: int
    round_count: int
    completed_at: datetime
