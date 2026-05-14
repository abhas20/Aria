"""Health log router — period, checkin, sleep, water, meditation tracking."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from core.database import get_db
from core.firebase import get_current_user
from models.daily_checkins import DailyCheckinLog
from models.meditation_logs import MeditationLog
from models.period_log import PeriodLog
from models.sleep_logs import SleepLog
from models.user import User
from models.water_logs import WaterLog
from models.weekly_summary import WeeklySummary
from services.summary import generate_weekly_summary
from schemas.health_log import (
    CheckinRequest,
    CheckinResponse,
    MeditationRequest,
    MeditationResponse,
    PeriodEndRequest,
    PeriodPatchRequest,
    PeriodResponse,
    PeriodStartRequest,
    PeriodStatusResponse,
    SleepRequest,
    SleepResponse,
    TodayResponse,
    TrendsResponse,
    MoodTrendPoint,
    SleepTrendPoint,
    WaterTrendPoint,
    WaterEntryResponse,
    WaterRequest,
    WaterTodayResponse,
    WeeklySummaryResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_user(firebase_uid: str, db: AsyncSession) -> User:
    """Fetch user by Firebase UID or raise 404."""
    result = await db.execute(
        select(User).where(User.firebase_uid == firebase_uid)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "user_not_found"},
        )
    return user


def _today_utc() -> date:
    """Return today's date in UTC."""
    return datetime.now(timezone.utc).date()


def _start_of_day(d: date) -> datetime:
    """Return midnight UTC for a given date."""
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)


def _end_of_day(d: date) -> datetime:
    """Return 23:59:59 UTC for a given date."""
    return datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=timezone.utc)


async def _get_today_checkin(
    user_id: uuid.UUID, db: AsyncSession
) -> DailyCheckinLog | None:
    """Return today's checkin for a user, or None."""
    today = _today_utc()
    result = await db.execute(
        select(DailyCheckinLog).where(
            DailyCheckinLog.user_id == user_id,
            DailyCheckinLog.logged_at >= _start_of_day(today),
            DailyCheckinLog.logged_at <= _end_of_day(today),
        )
    )
    return result.scalar_one_or_none()


async def _get_today_sleep(
    user_id: uuid.UUID, db: AsyncSession
) -> SleepLog | None:
    """Return today's sleep log for a user, or None."""
    today = _today_utc()
    result = await db.execute(
        select(SleepLog).where(
            SleepLog.user_id == user_id,
            SleepLog.logged_at >= _start_of_day(today),
            SleepLog.logged_at <= _end_of_day(today),
        )
    )
    return result.scalar_one_or_none()


async def _get_today_meditation(
    user_id: uuid.UUID, db: AsyncSession
) -> MeditationLog | None:
    """Return today's meditation log for a user, or None."""
    today = _today_utc()
    result = await db.execute(
        select(MeditationLog).where(
            MeditationLog.user_id == user_id,
            MeditationLog.logged_at >= _start_of_day(today),
            MeditationLog.logged_at <= _end_of_day(today),
        )
    )
    return result.scalar_one_or_none()


async def _get_today_water(
    user_id: uuid.UUID, db: AsyncSession
) -> list[WaterLog]:
    """Return all water entries for today."""
    today = _today_utc()
    result = await db.execute(
        select(WaterLog).where(
            WaterLog.user_id == user_id,
            WaterLog.logged_at >= _start_of_day(today),
            WaterLog.logged_at <= _end_of_day(today),
        ).order_by(WaterLog.logged_at.asc())
    )
    return list(result.scalars().all())


async def _get_active_period(
    user_id: uuid.UUID, db: AsyncSession
) -> PeriodLog | None:
    """Return the most recent period (active or just ended)."""
    result = await db.execute(
        select(PeriodLog)
        .where(PeriodLog.user_id == user_id)
        .order_by(PeriodLog.start_date.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def _build_period_status(period: PeriodLog | None) -> PeriodStatusResponse:
    """Build PeriodStatusResponse from a PeriodLog row."""
    if not period:
        return PeriodStatusResponse(
            active=False,
            day_number=None,
            period_id=None,
            start_date=None,
            flow_intensity=None,
            pain_level=None,
        )

    today = _today_utc()
    # Period is active if end_date is null OR end_date is today or later
    active = period.end_date is None or period.end_date >= today
    day_number = (today - period.start_date).days + 1 if active else None

    return PeriodStatusResponse(
        active=active,
        day_number=day_number,
        period_id=period.id,
        start_date=period.start_date,
        flow_intensity=period.flow_intensity,
        pain_level=period.pain_level,
    )


# ---------------------------------------------------------------------------
# Summary helper
# ---------------------------------------------------------------------------

async def _aggregate_week_data(
    user_id: uuid.UUID,
    week_start: date,
    week_end: date,
    db: AsyncSession,
) -> dict:
    """Collect and aggregate all health log data for a given week."""
    from sqlalchemy import func as sqlfunc

    start_dt = _start_of_day(week_start)
    end_dt = _end_of_day(week_end)

    # Checkin aggregates
    checkin_result = await db.execute(
        select(DailyCheckinLog).where(
            DailyCheckinLog.user_id == user_id,
            DailyCheckinLog.logged_at >= start_dt,
            DailyCheckinLog.logged_at <= end_dt,
        )
    )
    checkins = checkin_result.scalars().all()

    mood_scores = [c.mood_score for c in checkins if c.mood_score]
    energy_levels = [c.energy_level for c in checkins if c.energy_level]
    stress_levels = [c.stress_level for c in checkins if c.stress_level]

    # Aggregate symptoms across all checkins
    symptom_totals: dict[str, int] = {}
    for c in checkins:
        if c.symptoms:
            for symptom, severity in c.symptoms.items():
                symptom_totals[symptom] = symptom_totals.get(symptom, 0) + severity
    top_symptoms = sorted(symptom_totals, key=symptom_totals.get, reverse=True)[:3]

    # Sleep aggregates
    sleep_result = await db.execute(
        select(SleepLog).where(
            SleepLog.user_id == user_id,
            SleepLog.logged_at >= start_dt,
            SleepLog.logged_at <= end_dt,
        )
    )
    sleeps = sleep_result.scalars().all()
    sleep_hours = [float(s.sleep_hours) for s in sleeps]
    sleep_qualities = [s.quality_score for s in sleeps if s.quality_score]

    # Water aggregates
    water_result = await db.execute(
        select(WaterLog).where(
            WaterLog.user_id == user_id,
            WaterLog.logged_at >= start_dt,
            WaterLog.logged_at <= end_dt,
        )
    )
    waters = water_result.scalars().all()
    water_by_day: dict[date, int] = {}
    for w in waters:
        d = w.logged_at.date()
        water_by_day[d] = water_by_day.get(d, 0) + w.amount_ml

    # Meditation aggregates
    meditation_result = await db.execute(
        select(MeditationLog).where(
            MeditationLog.user_id == user_id,
            MeditationLog.logged_at >= start_dt,
            MeditationLog.logged_at <= end_dt,
        )
    )
    meditations = meditation_result.scalars().all()

    # Period status
    period_result = await db.execute(
        select(PeriodLog).where(
            PeriodLog.user_id == user_id,
            PeriodLog.start_date <= week_end,
        ).order_by(PeriodLog.start_date.desc()).limit(1)
    )
    period = period_result.scalar_one_or_none()
    period_active = (
        period is not None and
        (period.end_date is None or period.end_date >= week_start)
    )

    return {
        "mood_days": len(checkins),
        "avg_mood": round(sum(mood_scores) / len(mood_scores), 1) if mood_scores else None,
        "avg_energy": round(sum(energy_levels) / len(energy_levels), 1) if energy_levels else None,
        "avg_stress": round(sum(stress_levels) / len(stress_levels), 1) if stress_levels else None,
        "top_symptoms": ", ".join(top_symptoms) if top_symptoms else None,
        "avg_sleep": round(sum(sleep_hours) / len(sleep_hours), 1) if sleep_hours else None,
        "avg_sleep_quality": round(sum(sleep_qualities) / len(sleep_qualities), 1) if sleep_qualities else None,
        "water_days": len(water_by_day),
        "avg_water_ml": round(sum(water_by_day.values()) / len(water_by_day)) if water_by_day else 0,
        "meditation_sessions": len(meditations),
        "total_meditation_minutes": sum(m.duration_minutes for m in meditations),
        "period_active": "yes" if period_active else "no",
    }



# ---------------------------------------------------------------------------
# Daily Checkin endpoints
# ---------------------------------------------------------------------------

@router.post("/checkin", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
async def log_checkin(
    payload: CheckinRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckinResponse:
    """Log today's mood, symptoms, energy and stress.
    
    Only one checkin allowed per day — returns 409 if already logged.
    """
    user = await _get_user(firebase_claims["uid"], db)

    existing = await _get_today_checkin(user.id, db)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "checkin_already_exists_today"},
        )

    checkin = DailyCheckinLog(
        user_id=user.id,
        mood_score=payload.mood_score,
        mood_tags=payload.mood_tags,
        energy_level=payload.energy_level,
        stress_level=payload.stress_level,
        symptoms=payload.symptoms,
        notes=payload.notes,
    )
    db.add(checkin)
    await db.flush()
    return CheckinResponse.model_validate(checkin)


@router.get("/checkin/today", response_model=CheckinResponse | None)
async def get_today_checkin(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckinResponse | None:
    """Get today's checkin. Returns null if not yet logged."""
    user = await _get_user(firebase_claims["uid"], db)
    checkin = await _get_today_checkin(user.id, db)
    if not checkin:
        return None
    return CheckinResponse.model_validate(checkin)


@router.patch("/checkin", response_model=CheckinResponse)
async def update_checkin(
    payload: CheckinRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckinResponse:
    """Update today's checkin."""
    user = await _get_user(firebase_claims["uid"], db)

    checkin = await _get_today_checkin(user.id, db)
    if not checkin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "checkin_not_found_for_today"},
        )

    checkin.mood_score = payload.mood_score
    checkin.mood_tags = payload.mood_tags
    checkin.energy_level = payload.energy_level
    checkin.stress_level = payload.stress_level
    checkin.symptoms = payload.symptoms
    checkin.notes = payload.notes

    return CheckinResponse.model_validate(checkin)



# ---------------------------------------------------------------------------
# Period endpoints
# ---------------------------------------------------------------------------

@router.post("/period/start", response_model=PeriodResponse, status_code=status.HTTP_201_CREATED)
async def start_period(
    payload: PeriodStartRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodResponse:
    """Log the start of a period."""
    user = await _get_user(firebase_claims["uid"], db)

    period = PeriodLog(
        user_id=user.id,
        start_date=payload.start_date,
        flow_intensity=payload.flow_intensity,
        pain_level=payload.pain_level,
        clot_presence=payload.clot_presence,
        notes=payload.notes,
    )
    db.add(period)
    await db.flush()
    return PeriodResponse.model_validate(period)


@router.patch("/period/{period_id}/end", response_model=PeriodResponse)
async def end_period(
    period_id: uuid.UUID,
    payload: PeriodEndRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodResponse:
    """Add end date to an active period."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(PeriodLog).where(
            PeriodLog.id == period_id,
            PeriodLog.user_id == user.id,
        )
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "period_not_found"},
        )
    if period.end_date is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "period_already_ended"},
        )

    period.end_date = payload.end_date
    return PeriodResponse.model_validate(period)


@router.get("/period/current", response_model=PeriodStatusResponse)
async def get_current_period(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodStatusResponse:
    """Get active period status — used by dashboard."""
    user = await _get_user(firebase_claims["uid"], db)
    period = await _get_active_period(user.id, db)
    return _build_period_status(period)


@router.get("/period/history", response_model=list[PeriodResponse])
async def get_period_history(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PeriodResponse]:
    """List all periods, newest first."""
    user = await _get_user(firebase_claims["uid"], db)
    result = await db.execute(
        select(PeriodLog)
        .where(PeriodLog.user_id == user.id)
        .order_by(PeriodLog.start_date.desc())
    )
    return [PeriodResponse.model_validate(p) for p in result.scalars().all()]


@router.patch("/period/{period_id}", response_model=PeriodResponse)
async def update_period(
    period_id: uuid.UUID,
    payload: PeriodPatchRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodResponse:
    """Update period details (flow intensity, pain level, clot presence, notes)."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(PeriodLog).where(
            PeriodLog.id == period_id,
            PeriodLog.user_id == user.id,
        )
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "period_not_found"},
        )

    if payload.flow_intensity is not None:
        period.flow_intensity = payload.flow_intensity
    if payload.pain_level is not None:
        period.pain_level = payload.pain_level
    if payload.clot_presence is not None:
        period.clot_presence = payload.clot_presence
    if payload.notes is not None:
        period.notes = payload.notes
    if payload.start_date is not None:
        period.start_date = payload.start_date
    if payload.end_date is not None:
        if payload.end_date < period.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "end_date_before_start_date"},
            )
        period.end_date = payload.end_date

    return PeriodResponse.model_validate(period)


# ---------------------------------------------------------------------------
# Sleep endpoints
# ---------------------------------------------------------------------------

@router.post("/sleep", response_model=SleepResponse, status_code=status.HTTP_201_CREATED)
async def log_sleep(
    payload: SleepRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SleepResponse:
    """Log sleep. One entry per day allowed."""
    user = await _get_user(firebase_claims["uid"], db)

    existing = await _get_today_sleep(user.id, db)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "sleep_already_logged_today"},
        )

    sleep = SleepLog(
        user_id=user.id,
        sleep_hours=payload.sleep_hours,
        quality_score=payload.quality_score,
        bed_time=payload.bed_time,
        wake_time=payload.wake_time,
        notes=payload.notes,
    )
    db.add(sleep)
    await db.flush()
    return SleepResponse.model_validate(sleep)


@router.get("/sleep/today", response_model=SleepResponse | None)
async def get_today_sleep(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SleepResponse | None:
    """Get today's sleep log. Returns null if not yet logged."""
    user = await _get_user(firebase_claims["uid"], db)
    sleep = await _get_today_sleep(user.id, db)
    if not sleep:
        return None
    return SleepResponse.model_validate(sleep)


@router.patch("/sleep/{sleep_id}", response_model=SleepResponse)
async def update_sleep(
    sleep_id: uuid.UUID,
    payload: SleepRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SleepResponse:
    """Update today's sleep log."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(SleepLog).where(
            SleepLog.id == sleep_id,
            SleepLog.user_id == user.id,
        )
    )
    sleep = result.scalar_one_or_none()
    if not sleep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "sleep_log_not_found"},
        )

    sleep.sleep_hours = payload.sleep_hours
    sleep.quality_score = payload.quality_score
    sleep.bed_time = payload.bed_time
    sleep.wake_time = payload.wake_time
    sleep.notes = payload.notes

    return SleepResponse.model_validate(sleep)

# ---------------------------------------------------------------------------
# Water endpoints
# ---------------------------------------------------------------------------

@router.post("/water", response_model=WaterEntryResponse, status_code=status.HTTP_201_CREATED)
async def log_water(
    payload: WaterRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WaterEntryResponse:
    """Add a water intake entry. Multiple entries per day allowed."""
    user = await _get_user(firebase_claims["uid"], db)

    entry = WaterLog(user_id=user.id, amount_ml=payload.amount_ml)
    db.add(entry)
    await db.flush()
    return WaterEntryResponse.model_validate(entry)


@router.get("/water/today", response_model=WaterTodayResponse)
async def get_today_water(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WaterTodayResponse:
    """Get today's total water intake and individual entries."""
    user = await _get_user(firebase_claims["uid"], db)
    entries = await _get_today_water(user.id, db)
    total = sum(e.amount_ml for e in entries)
    return WaterTodayResponse(
        total_ml=total,
        entries=[WaterEntryResponse.model_validate(e) for e in entries],
    )


@router.patch("/water/{entry_id}", response_model=WaterEntryResponse)
async def update_water_entry(
    entry_id: uuid.UUID,
    payload: WaterRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WaterEntryResponse:
    """Update the amount of a specific water entry."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(WaterLog).where(
            WaterLog.id == entry_id,
            WaterLog.user_id == user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "water_entry_not_found"},
        )

    entry.amount_ml = payload.amount_ml
    return WaterEntryResponse.model_validate(entry)


@router.delete("/water/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_water_entry(
    entry_id: uuid.UUID,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a specific water entry."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(WaterLog).where(
            WaterLog.id == entry_id,
            WaterLog.user_id == user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "water_entry_not_found"},
        )

    await db.delete(entry)


# ---------------------------------------------------------------------------
# Meditation endpoints
# ---------------------------------------------------------------------------

@router.post("/meditation", response_model=MeditationResponse, status_code=status.HTTP_201_CREATED)
async def log_meditation(
    payload: MeditationRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeditationResponse:
    """Log a meditation session."""
    user = await _get_user(firebase_claims["uid"], db)

    meditation = MeditationLog(
        user_id=user.id,
        duration_minutes=payload.duration_minutes,
        meditation_name=payload.meditation_name,
        meditation_type=payload.meditation_type,
        notes=payload.notes,
    )
    db.add(meditation)
    await db.flush()
    return MeditationResponse.model_validate(meditation)


@router.get("/meditation/today", response_model=MeditationResponse | None)
async def get_today_meditation(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeditationResponse | None:
    """Get today's meditation log. Returns null if not yet logged."""
    user = await _get_user(firebase_claims["uid"], db)
    meditation = await _get_today_meditation(user.id, db)
    if not meditation:
        return None
    return MeditationResponse.model_validate(meditation)


@router.patch("/meditation/{meditation_id}", response_model=MeditationResponse)
async def update_meditation(
    meditation_id: uuid.UUID,
    payload: MeditationRequest,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeditationResponse:
    """Update today's meditation log."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(MeditationLog).where(
            MeditationLog.id == meditation_id,
            MeditationLog.user_id == user.id,
        )
    )
    meditation = result.scalar_one_or_none()
    if not meditation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "meditation_log_not_found"},
        )

    meditation.duration_minutes = payload.duration_minutes
    meditation.meditation_name = payload.meditation_name
    meditation.meditation_type = payload.meditation_type
    meditation.notes = payload.notes

    return MeditationResponse.model_validate(meditation)

# ---------------------------------------------------------------------------
# Today — combined dashboard endpoint
# ---------------------------------------------------------------------------

@router.get("/today", response_model=TodayResponse)
async def get_today(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TodayResponse:
    """Return all of today's health data in a single response.
    
    This is the main dashboard endpoint — call this once on page load
    instead of calling each endpoint separately.
    """
    user = await _get_user(firebase_claims["uid"], db)

    # Fetch everything in parallel using asyncio.gather
    import asyncio
    checkin, sleep, meditation, water_entries, period = await asyncio.gather(
        _get_today_checkin(user.id, db),
        _get_today_sleep(user.id, db),
        _get_today_meditation(user.id, db),
        _get_today_water(user.id, db),
        _get_active_period(user.id, db),
    )

    water_total = sum(e.amount_ml for e in water_entries)

    return TodayResponse(
        date=_today_utc(),
        checkin=CheckinResponse.model_validate(checkin) if checkin else None,
        sleep=SleepResponse.model_validate(sleep) if sleep else None,
        meditation=MeditationResponse.model_validate(meditation) if meditation else None,
        water=WaterTodayResponse(
            total_ml=water_total,
            entries=[WaterEntryResponse.model_validate(e) for e in water_entries],
        ),
        period=_build_period_status(period),
    )


# ---------------------------------------------------------------------------
# Trends — 30-day chart data
# ---------------------------------------------------------------------------

@router.get("/trends", response_model=TrendsResponse)
async def get_trends(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TrendsResponse:
    """Return 30-day trend data for mood, sleep and water charts."""
    from datetime import timedelta
    user = await _get_user(firebase_claims["uid"], db)

    today = _today_utc()
    thirty_days_ago = today - timedelta(days=29)
    start_dt = _start_of_day(thirty_days_ago)

    # Fetch last 30 days of checkins
    checkin_result = await db.execute(
        select(DailyCheckinLog)
        .where(
            DailyCheckinLog.user_id == user.id,
            DailyCheckinLog.logged_at >= start_dt,
        )
        .order_by(DailyCheckinLog.logged_at.asc())
    )
    checkins = checkin_result.scalars().all()

    # Fetch last 30 days of sleep
    sleep_result = await db.execute(
        select(SleepLog)
        .where(
            SleepLog.user_id == user.id,
            SleepLog.logged_at >= start_dt,
        )
        .order_by(SleepLog.logged_at.asc())
    )
    sleeps = sleep_result.scalars().all()

    # Fetch last 30 days of water — group by day
    water_result = await db.execute(
        select(WaterLog)
        .where(
            WaterLog.user_id == user.id,
            WaterLog.logged_at >= start_dt,
        )
        .order_by(WaterLog.logged_at.asc())
    )
    waters = water_result.scalars().all()

    # Group water entries by date
    water_by_date: dict[date, int] = {}
    for w in waters:
        d = w.logged_at.date()
        water_by_date[d] = water_by_date.get(d, 0) + w.amount_ml

    return TrendsResponse(
        mood=[
            MoodTrendPoint(
                date=c.logged_at.date(),
                mood_score=c.mood_score,
                energy_level=c.energy_level,
                stress_level=c.stress_level,
            )
            for c in checkins
        ],
        sleep=[
            SleepTrendPoint(
                date=s.logged_at.date(),
                sleep_hours=float(s.sleep_hours),
                quality_score=s.quality_score,
            )
            for s in sleeps
        ],
        water=[
            WaterTrendPoint(date=d, total_ml=total)
            for d, total in sorted(water_by_date.items())
        ],
    )


# ---------------------------------------------------------------------------
# Summary endpoints
# ---------------------------------------------------------------------------

@router.post("/summary/generate", response_model=WeeklySummaryResponse)
async def generate_summary(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WeeklySummaryResponse:
    """Generate AI weekly summary for the current week.

    If a summary already exists for this week, returns the cached one
    instead of calling Gemini again.
    """
    user = await _get_user(firebase_claims["uid"], db)

    today = _today_utc()
    # Week runs Monday → Sunday
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    # Return cached summary if already generated this week
    existing = await db.execute(
        select(WeeklySummary).where(
            WeeklySummary.user_id == user.id,
            WeeklySummary.week_start == week_start,
        )
    )
    cached = existing.scalar_one_or_none()
    if cached:
        return WeeklySummaryResponse.model_validate(cached)

    # Aggregate health data for the week
    health_data = await _aggregate_week_data(user.id, week_start, week_end, db)

    # Call Gemini
    summary_text, tips = await generate_weekly_summary(
        health_data=health_data,
        language=user.preferred_language,
    )

    # Store result
    summary = WeeklySummary(
        user_id=user.id,
        week_start=week_start,
        week_end=week_end,
        summary_text=summary_text,
        tips=tips,
    )
    db.add(summary)
    await db.flush()

    return WeeklySummaryResponse.model_validate(summary)


@router.get("/summary/history", response_model=list[WeeklySummaryResponse])
async def get_summary_history(
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WeeklySummaryResponse]:
    """List all past weekly summaries, newest first."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(WeeklySummary)
        .where(WeeklySummary.user_id == user.id)
        .order_by(WeeklySummary.week_start.desc())
    )
    return [
        WeeklySummaryResponse.model_validate(s)
        for s in result.scalars().all()
    ]

@router.delete("/summary/delete/{summary_id}", status_code=status.HTTP_204_NO_CONTENT,response_model=None)
async def delete_summary(
    summary_id: uuid.UUID,
    firebase_claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a weekly summary by ID."""
    user = await _get_user(firebase_claims["uid"], db)

    result = await db.execute(
        select(WeeklySummary).where(
            WeeklySummary.id == summary_id,
            WeeklySummary.user_id == user.id,
        )
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "summary_not_found"},
        )

    await db.delete(summary)