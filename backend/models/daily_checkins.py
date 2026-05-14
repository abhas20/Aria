"""SQL Alchemy model for DailyCheckinLog."""

from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String
from core.database import Base


class DailyCheckinLog(Base):
    __tablename__ = "daily_checkin_logs"

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
    mood_score: Mapped[int | None] = mapped_column(Integer, nullable=True)   # 1-10
    mood_tags: Mapped[list] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
        server_default="{}",
    )  # ["anxious", "calm", "foggy", "happy", "irritable", "sad"]
    energy_level: Mapped[int | None] = mapped_column(Integer, nullable=True) # 1-10
    stress_level: Mapped[int | None] = mapped_column(Integer, nullable=True) # 1-10
    symptoms: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )  # {"bloating": 3, "fatigue": 5, "cramps": 2, "brain_fog": 1}
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )