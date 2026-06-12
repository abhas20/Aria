"""Yoga router — poses, session plans, and session history."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.firebase import get_current_user
from models.user import User
from models.yoga_sessions import YogaSession
from schemas.yoga import (
    SessionPlanSchema,
    YogaCompleteRequest,
    YogaPoseSchema,
    YogaSessionResponse,
)
from fastapi import HTTPException

router = APIRouter()


# ---------------------------------------------------------------------------
# Static data
# ---------------------------------------------------------------------------

_POSES: list[YogaPoseSchema] = [
    YogaPoseSchema(
        id="tadasana",
        name="Mountain Pose",
        sanskrit_name="Tadasana",
        reference_image_url="",
        hold_duration_seconds=30,
    ),
    YogaPoseSchema(
        id="balasana",
        name="Child's Pose",
        sanskrit_name="Balasana",
        reference_image_url="",
        hold_duration_seconds=45,
    ),
    YogaPoseSchema(
        id="cat-cow",
        name="Cat-Cow",
        sanskrit_name="Marjaryasana-Bitilasana",
        reference_image_url="",
        hold_duration_seconds=30,
    ),
    YogaPoseSchema(
        id="warrior-i",
        name="Warrior I",
        sanskrit_name="Virabhadrasana I",
        reference_image_url="",
        hold_duration_seconds=30,
    ),
    YogaPoseSchema(
        id="viparita-karani",
        name="Legs Up the Wall",
        sanskrit_name="Viparita Karani",
        reference_image_url="",
        hold_duration_seconds=60,
    ),
]

_POSE_MAP = {p.id: p for p in _POSES}

_PLANS: list[SessionPlanSchema] = [
    SessionPlanSchema(
        id="pcos-relief",
        name="PCOS Relief",
        description="A gentle sequence designed to support hormonal balance and reduce PCOS symptoms through restorative poses.",
        poses=[
            _POSE_MAP["tadasana"],
            _POSE_MAP["balasana"],
            _POSE_MAP["cat-cow"],
            _POSE_MAP["warrior-i"],
            _POSE_MAP["viparita-karani"],
        ],
    ),
    SessionPlanSchema(
        id="anxiety-relief",
        name="Anxiety & Stress Relief",
        description="Calming poses that activate the parasympathetic nervous system to ease anxiety and melt away stress.",
        poses=[
            _POSE_MAP["balasana"],
            _POSE_MAP["cat-cow"],
            _POSE_MAP["viparita-karani"],
            _POSE_MAP["tadasana"],
            _POSE_MAP["balasana"],
        ],
    ),
    SessionPlanSchema(
        id="beginner-flow",
        name="Beginner Flow",
        description="A welcoming introduction to yoga with foundational poses that build strength, flexibility, and body awareness.",
        poses=[
            _POSE_MAP["tadasana"],
            _POSE_MAP["cat-cow"],
            _POSE_MAP["balasana"],
            _POSE_MAP["warrior-i"],
            _POSE_MAP["viparita-karani"],
        ],
    ),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_user(firebase_uid: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "user_not_found"},
        )
    return user


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/poses", response_model=list[YogaPoseSchema])
async def get_poses() -> list[YogaPoseSchema]:
    """Return the list of available yoga poses."""
    return _POSES


@router.get("/sessions", response_model=list[SessionPlanSchema])
async def get_sessions() -> list[SessionPlanSchema]:
    """Return the list of pre-built session plans."""
    return _PLANS


@router.post(
    "/complete",
    response_model=YogaSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def complete_session(
    payload: YogaCompleteRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> YogaSessionResponse:
    """Log a completed yoga session."""
    user = await _get_user(firebase_claims["uid"], db)

    session = YogaSession(
        user_id=user.id,
        plan_name=payload.plan_name,
        duration_seconds=payload.duration_seconds,
        average_pose_score=payload.average_pose_score,
        calories_estimate=payload.calories_estimate,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()
    return YogaSessionResponse.model_validate(session)


@router.get("/history", response_model=list[YogaSessionResponse])
async def get_history(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[YogaSessionResponse]:
    """List completed yoga sessions for the current user, newest first."""
    user = await _get_user(firebase_claims["uid"], db)
    result = await db.execute(
        select(YogaSession)
        .where(YogaSession.user_id == user.id)
        .order_by(YogaSession.completed_at.desc())
    )
    return [YogaSessionResponse.model_validate(s) for s in result.scalars().all()]


@router.delete(
    "/history/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_session(
    session_id: uuid.UUID,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a completed yoga session."""
    user = await _get_user(firebase_claims["uid"], db)
    result = await db.execute(
        select(YogaSession).where(
            YogaSession.id == session_id,
            YogaSession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "session_not_found"},
        )
    await db.delete(session)
