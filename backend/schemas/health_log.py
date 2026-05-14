from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Daily Checkin
# ---------------------------------------------------------------------------

class CheckinRequest(BaseModel):
    mood_score: int | None = Field(None, ge=1, le=10)
    mood_tags: list[str] = []
    energy_level: int | None = Field(None, ge=1, le=10)
    stress_level: int | None = Field(None, ge=1, le=10)
    symptoms: dict[str, int] = {}
    # e.g. {"bloating": 3, "fatigue": 5}(val 1-5)
    notes: str | None = None


class CheckinResponse(BaseModel):
    id: uuid.UUID
    mood_score: int | None
    mood_tags: list[str]
    energy_level: int | None
    stress_level: int | None
    symptoms: dict[str, int]
    notes: str | None
    logged_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Period
# ---------------------------------------------------------------------------

class PeriodStartRequest(BaseModel):
    start_date: date
    flow_intensity: str = Field(..., pattern="^(light|medium|heavy)$")
    pain_level: int | None = Field(None, ge=1, le=10)
    clot_presence: bool = False
    notes: str | None = None


class PeriodEndRequest(BaseModel):
    end_date: date


class PeriodPatchRequest(BaseModel):
    """Partial update for a period log — all fields optional."""
    start_date: date | None = None
    end_date: date | None = None
    flow_intensity: str | None = Field(None, pattern="^(light|medium|heavy)$")
    pain_level: int | None = Field(None, ge=1, le=10)
    clot_presence: bool | None = None
    notes: str | None = None


class PeriodResponse(BaseModel):
    id: uuid.UUID
    start_date: date
    end_date: date | None
    flow_intensity: str
    pain_level: int | None
    clot_presence: bool
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Sleep
# ---------------------------------------------------------------------------

class SleepRequest(BaseModel):
    sleep_hours: float = Field(..., ge=0, le=24)
    quality_score: int | None = Field(None, ge=1, le=5)
    bed_time: datetime
    wake_time: datetime
    notes: str | None = None


class SleepResponse(BaseModel):
    id: uuid.UUID
    sleep_hours: float
    quality_score: int | None
    bed_time: datetime
    wake_time: datetime
    notes: str | None
    logged_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Water
# ---------------------------------------------------------------------------

class WaterRequest(BaseModel):
    amount_ml: int = Field(..., ge=1, le=5000)


class WaterEntryResponse(BaseModel):
    id: uuid.UUID
    amount_ml: int
    logged_at: datetime

    model_config = {"from_attributes": True}


class WaterTodayResponse(BaseModel):
    total_ml: int
    entries: list[WaterEntryResponse]


# ---------------------------------------------------------------------------
# Meditation
# ---------------------------------------------------------------------------

class MeditationRequest(BaseModel):
    duration_minutes: int = Field(..., ge=1)
    meditation_name: str | None = None
    meditation_type: str  # "mindfulness" | "breathing" | "yoga_nidra" | "guided"
    notes: str | None = None


class MeditationResponse(BaseModel):
    id: uuid.UUID
    duration_minutes: int
    meditation_name: str | None
    meditation_type: str
    notes: str | None
    logged_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Today — combined dashboard response
# ---------------------------------------------------------------------------

class PeriodStatusResponse(BaseModel):
    """Active period info for today's dashboard."""
    active: bool
    day_number: int | None        # which day of the period (e.g. day 3)
    period_id: uuid.UUID | None
    start_date: date | None
    flow_intensity: str | None
    pain_level: int | None


class TodayResponse(BaseModel):
    date: date
    checkin: CheckinResponse | None         # None if not logged yet today
    sleep: SleepResponse | None             # None if not logged yet today
    water: WaterTodayResponse               # always returned, total_ml=0 if none
    meditation: MeditationResponse | None   # None if not logged yet today
    period: PeriodStatusResponse            # always returned, active=False if no period


# ---------------------------------------------------------------------------
# Trends — 30-day chart data
# ---------------------------------------------------------------------------

class MoodTrendPoint(BaseModel):
    date: date
    mood_score: int | None
    energy_level: int | None
    stress_level: int | None


class SleepTrendPoint(BaseModel):
    date: date
    sleep_hours: float | None
    quality_score: int | None


class WaterTrendPoint(BaseModel):
    date: date
    total_ml: int


class TrendsResponse(BaseModel):
    mood: list[MoodTrendPoint]
    sleep: list[SleepTrendPoint]
    water: list[WaterTrendPoint]


class WeeklySummaryResponse(BaseModel):
    id: uuid.UUID
    week_start: date
    week_end: date
    summary_text: str
    tips: list[str]
    generated_at: datetime

    model_config = {"from_attributes": True}