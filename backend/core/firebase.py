"""Firebase Admin SDK initialisation and token verification utilities."""

from __future__ import annotations

import asyncio
import json
import logging
from functools import partial

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth, credentials

from core.config import settings

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Firebase app singleton — initialised eagerly at import time (thread-safe)
# ---------------------------------------------------------------------------

def _init_firebase() -> firebase_admin.App:
    if settings.FIREBASE_SERVICE_ACCOUNT_KEY_JSON:
        cred = credentials.Certificate(
            json.loads(settings.FIREBASE_SERVICE_ACCOUNT_KEY_JSON)
        )
    elif settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
    else:
        cred = credentials.ApplicationDefault()

    return firebase_admin.initialize_app(
        cred,
        {"projectId": settings.FIREBASE_PROJECT_ID},
    )


_app = _init_firebase()


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------

async def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims.
    
    Runs the synchronous firebase_admin call in a thread pool
    to avoid blocking the async event loop.
    """
    loop = asyncio.get_running_loop()  # safe inside async context
    decoded: dict = await loop.run_in_executor(
        None, partial(auth.verify_id_token, id_token)
    )
    return decoded


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    """FastAPI dependency — extract and verify the Firebase Bearer token.

    Usage:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"uid": user["uid"]}
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "missing_token"},
        )

    try:
        decoded = await verify_firebase_token(credentials.credentials)
    except Exception as e:
        logger.warning("Token verification failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_token"},
        )

    return decoded