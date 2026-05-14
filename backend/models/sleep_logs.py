"""SQL Alchemy model for SleepLog."""

from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from core.database import Base


class SleepLog(Base):
    __tablename__ = "sleep_logs"

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
    sleep_hours: Mapped[float] = mapped_column(Numeric(3, 1), nullable=False)  # e.g. 7.5
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    bed_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    wake_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )