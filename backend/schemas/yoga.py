"""Pydantic schemas for yoga endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Pose & Session Plan (static data — no DB)
# ---------------------------------------------------------------------------

class YogaPoseSchema(BaseModel):
    id: str
    name: str
    sanskrit_name: str
    reference_image_url: str
    hold_duration_seconds: int


class SessionPlanSchema(BaseModel):
    id: str
    name: str
    description: str
    poses: list[YogaPoseSchema]


# ---------------------------------------------------------------------------
# Complete session request / response
# ---------------------------------------------------------------------------

class YogaCompleteRequest(BaseModel):
    plan_name: str
    duration_seconds: int
    average_pose_score: float
    calories_estimate: float


class YogaSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_name: str
    duration_seconds: int
    average_pose_score: float
    calories_estimate: float
    completed_at: datetime
