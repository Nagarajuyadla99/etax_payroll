"""Publish WF domain events to existing domain_events outbox."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.event_models import DomainEvent


async def publish_wf_event(
    db: AsyncSession,
    organisation_id: UUID,
    event_type: str,
    payload: dict[str, Any],
    *,
    dedupe_key: str | None = None,
    correlation_id: str | None = None,
) -> DomainEvent:
    key = dedupe_key or f"{event_type}:{organisation_id}:{datetime.now(timezone.utc).isoformat()}"
    ev = DomainEvent(
        organisation_id=organisation_id,
        event_type=event_type,
        dedupe_key=key[:160],
        payload=payload,
        status="pending",
        correlation_id=correlation_id,
    )
    db.add(ev)
    await db.flush()
    return ev
