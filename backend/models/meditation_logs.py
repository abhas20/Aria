""" SQL Alchemy model for MeditationLog. """
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, func, text,Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

class MeditationLog(Base):
    __tablename__ = "meditation_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    duration_minutes: Mapped[int] = mapped_column(nullable=False)
    meditation_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meditation_type: Mapped[str] = mapped_column(String(32), nullable=False)  # "mindfulness" | "transcendental" | etc.
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )