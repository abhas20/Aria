"""Unit tests for core/firebase.py — Firebase token verification middleware.

All firebase_admin calls are mocked so these tests run without a real
Firebase project or service-account key.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.firebase import get_current_user, verify_firebase_token

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

VALID_CLAIMS = {
    "uid": "test-uid-123",
    "email": "user@example.com",
    "name": "Test User",
}


def _make_app() -> FastAPI:
    """Create a minimal FastAPI app with a single protected route."""
    app = FastAPI()

    @app.get("/protected")
    async def protected(user: dict = __import__("fastapi").Depends(get_current_user)):
        return {"uid": user["uid"]}

    return app


# ---------------------------------------------------------------------------
# Tests for verify_firebase_token()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_verify_firebase_token_returns_claims_on_valid_token():
    """verify_firebase_token should return decoded claims for a valid token."""
    with (
        patch("core.firebase.get_firebase_app"),
        patch("core.firebase.auth.verify_id_token", return_value=VALID_CLAIMS),
    ):
        result = await verify_firebase_token("valid-token")

    assert result == VALID_CLAIMS


@pytest.mark.asyncio
async def test_verify_firebase_token_propagates_invalid_token_error():
    """verify_firebase_token should propagate InvalidIdTokenError."""
    from firebase_admin.auth import InvalidIdTokenError

    with (
        patch("core.firebase.get_firebase_app"),
        patch(
            "core.firebase.auth.verify_id_token",
            side_effect=InvalidIdTokenError("bad token"),
        ),
    ):
        with pytest.raises(InvalidIdTokenError):
            await verify_firebase_token("bad-token")


@pytest.mark.asyncio
async def test_verify_firebase_token_propagates_expired_token_error():
    """verify_firebase_token should propagate ExpiredIdTokenError."""
    from firebase_admin.auth import ExpiredIdTokenError

    with (
        patch("core.firebase.get_firebase_app"),
        patch(
            "core.firebase.auth.verify_id_token",
            side_effect=ExpiredIdTokenError("expired", cause=None),
        ),
    ):
        with pytest.raises(ExpiredIdTokenError):
            await verify_firebase_token("expired-token")


# ---------------------------------------------------------------------------
# Tests for get_current_user() via HTTP (TestClient)
# ---------------------------------------------------------------------------


@pytest.fixture()
def client():
    app = _make_app()
    return TestClient(app, raise_server_exceptions=False)


def test_missing_authorization_header_returns_401_missing_token(client):
    """No Authorization header → 401 with missing_token."""
    response = client.get("/protected")
    assert response.status_code == 401
    assert response.json()["detail"] == {"error": "missing_token"}


def test_empty_bearer_token_returns_401_missing_token(client):
    """Authorization header present but empty bearer value → 401 missing_token."""
    # HTTPBearer will reject a malformed header; FastAPI returns 403 by default
    # when auto_error=True, but we set auto_error=False so credentials will be
    # None and our code returns missing_token.
    response = client.get("/protected", headers={"Authorization": "Bearer "})
    assert response.status_code == 401
    assert response.json()["detail"] == {"error": "missing_token"}


def test_invalid_token_returns_401_invalid_token(client):
    """A token that fails firebase verification → 401 with invalid_token."""
    from firebase_admin.auth import InvalidIdTokenError

    with (
        patch("core.firebase.get_firebase_app"),
        patch(
            "core.firebase.auth.verify_id_token",
            side_effect=InvalidIdTokenError("bad"),
        ),
    ):
        response = client.get(
            "/protected", headers={"Authorization": "Bearer bad-token"}
        )

    assert response.status_code == 401
    assert response.json()["detail"] == {"error": "invalid_token"}


def test_expired_token_returns_401_invalid_token(client):
    """An expired token → 401 with invalid_token (not a separate error code)."""
    from firebase_admin.auth import ExpiredIdTokenError

    with (
        patch("core.firebase.get_firebase_app"),
        patch(
            "core.firebase.auth.verify_id_token",
            side_effect=ExpiredIdTokenError("expired", cause=None),
        ),
    ):
        response = client.get(
            "/protected", headers={"Authorization": "Bearer expired-token"}
        )

    assert response.status_code == 401
    assert response.json()["detail"] == {"error": "invalid_token"}


def test_revoked_token_returns_401_invalid_token(client):
    """A revoked token → 401 with invalid_token."""
    from firebase_admin.auth import RevokedIdTokenError

    with (
        patch("core.firebase.get_firebase_app"),
        patch(
            "core.firebase.auth.verify_id_token",
            side_effect=RevokedIdTokenError("revoked"),
        ),
    ):
        response = client.get(
            "/protected", headers={"Authorization": "Bearer revoked-token"}
        )

    assert response.status_code == 401
    assert response.json()["detail"] == {"error": "invalid_token"}


def test_valid_token_returns_200_with_uid(client):
    """A valid token → 200 with the uid from decoded claims."""
    with (
        patch("core.firebase.get_firebase_app"),
        patch(
            "core.firebase.auth.verify_id_token",
            return_value=VALID_CLAIMS,
        ),
    ):
        response = client.get(
            "/protected", headers={"Authorization": "Bearer valid-token"}
        )

    assert response.status_code == 200
    assert response.json() == {"uid": "test-uid-123"}


def test_unexpected_exception_returns_401_invalid_token(client):
    """Any unexpected exception during verification → 401 with invalid_token."""
    with (
        patch("core.firebase.get_firebase_app"),
        patch(
            "core.firebase.auth.verify_id_token",
            side_effect=ValueError("unexpected"),
        ),
    ):
        response = client.get(
            "/protected", headers={"Authorization": "Bearer some-token"}
        )

    assert response.status_code == 401
    assert response.json()["detail"] == {"error": "invalid_token"}


def test_non_bearer_scheme_returns_401_missing_token(client):
    """Authorization header with non-Bearer scheme → 401 missing_token."""
    response = client.get(
        "/protected", headers={"Authorization": "Basic dXNlcjpwYXNz"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == {"error": "missing_token"}
