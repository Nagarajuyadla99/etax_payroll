from __future__ import annotations

import asyncio

from celery.utils.log import get_task_logger
from sqlalchemy.ext.asyncio import AsyncSession

from celery_app import celery_app
from database import AsyncSessionLocal
from services.event_bus import claim_pending_events, mark_failed, mark_processed


log = get_task_logger(__name__)


async def _handle_event(db: AsyncSession, ev) -> None:
    """
    Phase 2G baseline handlers.
    Keep handlers tiny; they should call existing services, not reimplement business logic.
    """
    # For now, just a structured log. Future: push to Kafka/Rabbit, notify, etc.
    log.info(
        "DomainEvent type=%s id=%s org=%s payload=%s",
        ev.event_type,
        str(ev.event_id),
        str(ev.organisation_id),
        ev.payload,
    )


@celery_app.task(
    name="events.dispatch",
    autoretry_for=(),
    soft_time_limit=30,
    time_limit=60,
)
def dispatch_events(limit: int = 50):
    async def _go():
        async with AsyncSessionLocal() as db:
            async with db.begin():
                events = await claim_pending_events(db, limit=limit, lock_seconds=60)
            if not events:
                return {"ok": True, "dispatched": 0}

            for ev in events:
                try:
                    async with db.begin():
                        await _handle_event(db, ev)
                        await mark_processed(db, event_id=ev.event_id)
                except Exception as e:
                    async with db.begin():
                        await mark_failed(db, event_id=ev.event_id, error=str(e), attempts=int((ev.attempts or 0) + 1))
            return {"ok": True, "dispatched": len(events)}

    log.info("Dispatching domain events (limit=%s)", limit)
    return asyncio.run(_go())

