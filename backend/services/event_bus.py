from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from models.event_models import DomainEvent
from utils.request_context import get_request_context


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


async def publish_event(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    event_type: str,
    dedupe_key: str,
    payload: dict[str, Any],
) -> DomainEvent:
    """
    Insert event into outbox with org+dedupe unique constraint.
    Caller owns transaction boundary.
    """
    ctx = get_request_context()
    ev = DomainEvent(
        organisation_id=organisation_id,
        event_type=event_type,
        dedupe_key=dedupe_key,
        payload=payload,
        status="pending",
        next_attempt_at=_now(),
        correlation_id=ctx.correlation_id,
        request_id=ctx.request_id,
    )
    db.add(ev)
    await db.flush()
    return ev


async def claim_pending_events(
    db: AsyncSession,
    *,
    limit: int = 50,
    lock_seconds: int = 60,
) -> list[DomainEvent]:
    """
    Best-effort claim:
    - Select pending/failed events due for retry, not locked (or lock expired)
    - Mark as processing with locked_until
    Caller owns transaction boundary.
    """
    now = _now()
    q = (
        select(DomainEvent)
        .where(
            DomainEvent.is_active.is_(True),
            DomainEvent.status.in_(["pending", "failed"]),
            or_(DomainEvent.next_attempt_at.is_(None), DomainEvent.next_attempt_at <= now),
            or_(DomainEvent.locked_until.is_(None), DomainEvent.locked_until <= now),
        )
        .order_by(DomainEvent.created_at.asc())
        .limit(limit)
        .with_for_update(skip_locked=True)
    )
    res = await db.execute(q)
    events = list(res.scalars().all())
    if not events:
        return []

    locked_until = now + timedelta(seconds=lock_seconds)
    for ev in events:
        ev.status = "processing"
        ev.locked_until = locked_until
        ev.attempts = int(ev.attempts or 0)
    await db.flush()
    return events


def _next_backoff(attempts: int) -> timedelta:
    # 1, 2, 4, 8, 16 minutes capped at 30 minutes
    mins = min(30, 2 ** max(0, attempts))
    return timedelta(minutes=mins)


async def mark_processed(db: AsyncSession, *, event_id: UUID) -> None:
    now = _now()
    await db.execute(
        update(DomainEvent)
        .where(DomainEvent.event_id == event_id)
        .values(status="processed", processed_at=now, locked_until=None, last_error=None)
    )


async def mark_failed(db: AsyncSession, *, event_id: UUID, error: str, attempts: int) -> None:
    now = _now()
    next_at = now + _next_backoff(attempts)
    status = "dead" if attempts >= 5 else "failed"
    await db.execute(
        update(DomainEvent)
        .where(DomainEvent.event_id == event_id)
        .values(
            status=status,
            last_error=error[:2000],
            next_attempt_at=(None if status == "dead" else next_at),
            locked_until=None,
            attempts=attempts,
        )
    )

