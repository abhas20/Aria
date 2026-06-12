"""Timer router — workout plans and session history."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.firebase import get_current_user
from models.timer_sessions import TimerSession
from models.user import User
from schemas.timer import (
    TimerCompleteRequest,
    TimerSessionResponse,
    WorkoutPlanSchema,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Static data
# ---------------------------------------------------------------------------

_WORKOUT_PLANS: list[WorkoutPlanSchema] = [
    WorkoutPlanSchema(
        id="pcos-cardio-burst",
        name="PCOS Cardio Burst",
        mode="hiit",
        work_duration_seconds=30,
        rest_duration_seconds=20,
        round_count=8,
        description="High-intensity intervals designed to boost metabolism and support hormonal health for PCOS.",
    ),
    WorkoutPlanSchema(
        id="stress-relief-flow",
        name="Stress Relief Flow",
        mode="custom",
        work_duration_seconds=45,
        rest_duration_seconds=30,
        round_count=6,
        description="Moderate-intensity intervals with longer rest periods to reduce cortisol and ease stress.",
    ),
    WorkoutPlanSchema(
        id="beginner-full-body",
        name="Beginner Full Body",
        mode="tabata",
        work_duration_seconds=20,
        rest_duration_seconds=10,
        round_count=8,
        description="Classic Tabata protocol — short bursts with minimal rest — perfect for building fitness from scratch.",
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

@router.get("/workouts", response_model=list[WorkoutPlanSchema])
async def get_workouts() -> list[WorkoutPlanSchema]:
    """Return the list of pre-built workout plans."""
    return _WORKOUT_PLANS


@router.post(
    "/complete",
    response_model=TimerSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def complete_session(
    payload: TimerCompleteRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimerSessionResponse:
    """Log a completed timer session."""
    user = await _get_user(firebase_claims["uid"], db)

    session = TimerSession(
        user_id=user.id,
        mode=payload.mode,
        plan_name=payload.plan_name,
        duration_seconds=payload.duration_seconds,
        round_count=payload.round_count,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()
    return TimerSessionResponse.model_validate(session)


@router.get("/history", response_model=list[TimerSessionResponse])
async def get_history(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[TimerSessionResponse]:
    """List completed timer sessions for the current user, newest first."""
    user = await _get_user(firebase_claims["uid"], db)
    result = await db.execute(
        select(TimerSession)
        .where(TimerSession.user_id == user.id)
        .order_by(TimerSession.completed_at.desc())
    )
    return [TimerSessionResponse.model_validate(s) for s in result.scalars().all()]


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
    """Delete a completed timer session."""
    user = await _get_user(firebase_claims["uid"], db)
    result = await db.execute(
        select(TimerSession).where(
            TimerSession.id == session_id,
            TimerSession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "session_not_found"},
        )
    await db.delete(session)
