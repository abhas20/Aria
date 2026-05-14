from functools import lru_cache
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _clean_asyncpg_url(v: str) -> str:
    """Coerce a plain postgres(ql):// URL to postgresql+asyncpg://.

    asyncpg does not accept sslmode/channel_binding as query params —
    SSL is enabled via connect_args instead. Strip those params here so
    SQLAlchemy doesn't pass them through to asyncpg.
    """
    for prefix, replacement in [
        ("postgresql://", "postgresql+asyncpg://"),
        ("postgres://", "postgresql+asyncpg://"),
    ]:
        if v.startswith(prefix):
            v = v.replace(prefix, replacement, 1)
            break

    # Strip asyncpg-incompatible query params
    parsed = urlparse(v)
    params = parse_qs(parsed.query, keep_blank_values=True)
    for key in ("sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey"):
        params.pop(key, None)
    cleaned_query = urlencode({k: vals[0] for k, vals in params.items()})
    return urlunparse(parsed._replace(query=cleaned_query))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    APP_ENV: str = "development" #!should be "production" in production
    SECRET_KEY: str = "change-me-in-production" # !replace with a secure random value in production

    DATABASE_URL: str = ""

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def coerce_asyncpg_scheme(cls, v: str) -> str:
        return _clean_asyncpg_url(v)

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: str = ""
    FIREBASE_SERVICE_ACCOUNT_KEY_JSON: str = ""

    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Sarvam AI (STT/TTS)
    SARVAM_API_KEY: str = ""
    SARVAM_API_BASE_URL: str = "https://api.sarvam.ai"

    # Google Cloud (fallback STT/TTS)
    GOOGLE_CLOUD_PROJECT_ID: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    # Cloudinary (media storage)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
