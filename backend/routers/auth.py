"""Auth router — Firebase-backed user management."""

from __future__ import annotations
import asyncio
from functools import partial

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.firebase import get_current_user
from firebase_admin import auth as firebase_auth
from models.user import User
from schemas.auth import OnboardingRequest, UpdateProfileRequest, UserResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_create_user(firebase_claims: dict, db: AsyncSession) -> User:
    """Upsert a User row from Firebase token claims."""
    firebase_uid: str = firebase_claims["uid"]
    email: str | None = firebase_claims.get("email")

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user: User | None = result.scalar_one_or_none()

    if user is None:
        user = User(firebase_uid=firebase_uid, email=email)
        db.add(user)
        await db.flush()
    elif user.email != email:
        user.email = email

    return user


async def _get_existing_user(firebase_uid: str, db: AsyncSession) -> User:
    """Fetch user or raise 404."""
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "user_not_found"},
        )
    return user


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/verify", response_model=UserResponse)
async def verify(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Verify Firebase token, upsert user row, return profile + onboarding status."""
    user = await _get_or_create_user(firebase_claims, db)
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def me(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Return current user's profile."""
    user = await _get_existing_user(firebase_claims["uid"], db)
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update profile fields after onboarding (name, language, etc.)."""
    user = await _get_existing_user(firebase_claims["uid"], db)

    if payload.name is not None:
        user.name = payload.name
    if payload.preferred_language is not None:
        user.preferred_language = payload.preferred_language
    if payload.date_of_birth is not None:
        user.date_of_birth = payload.date_of_birth
    if payload.health_concerns is not None:
        user.health_concerns = payload.health_concerns

    return UserResponse.model_validate(user)


@router.post("/onboarding", response_model=UserResponse)
async def onboarding(
    payload: OnboardingRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Save onboarding data and mark onboarding complete."""
    user = await _get_or_create_user(firebase_claims, db)

    user.name = payload.name
    user.date_of_birth = payload.date_of_birth 
    user.health_concerns = payload.health_concerns    
    user.preferred_language = payload.preferred_language
    user.onboarding_complete = True

    return UserResponse.model_validate(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_account(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete account — removes DB row and Firebase Auth user."""
    firebase_uid: str = firebase_claims["uid"]
    user = await _get_existing_user(firebase_uid, db)

    await db.delete(user)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None, partial(firebase_auth.delete_user, firebase_uid)
    )