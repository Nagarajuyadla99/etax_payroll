from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_async_db
from models.event_models import DomainEvent
from utils.dependencies import get_current_auth, resolve_organisation_id
from utils.rbac import require_roles


router = APIRouter(prefix="/events", tags=["Events (Phase 2G)"])


@router.get("")
async def list_events(
    status_filter: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")
    limit = max(1, min(200, int(limit)))

    q = select(DomainEvent).where(DomainEvent.organisation_id == org_id).order_by(DomainEvent.created_at.desc()).limit(limit)
    if status_filter:
        q = q.where(DomainEvent.status == status_filter)
    if event_type:
        q = q.where(DomainEvent.event_type == event_type)

    res = await db.execute(q)
    return [
        {
            "event_id": str(e.event_id),
            "event_type": e.event_type,
            "status": e.status,
            "attempts": e.attempts,
            "last_error": e.last_error,
            "payload": e.payload,
            "created_at": e.created_at,
            "processed_at": e.processed_at,
            "correlation_id": e.correlation_id,
            "request_id": e.request_id,
        }
        for e in res.scalars().all()
    ]


@router.post("/{event_id}/redeliver", status_code=status.HTTP_202_ACCEPTED)
async def redeliver_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    auth=Depends(get_current_auth),
    current_user=Depends(require_roles(["admin", "finance"])),
):
    org_id = resolve_organisation_id(auth.principal, auth.payload)
    if not org_id:
        raise HTTPException(status_code=400, detail="Organisation not found")

    ev = await db.get(DomainEvent, event_id)
    if not ev or str(ev.organisation_id) != str(org_id):
        raise HTTPException(status_code=404, detail="Event not found")

    async with db.begin():
        await db.execute(
            update(DomainEvent)
            .where(DomainEvent.event_id == event_id)
            .values(status="pending", next_attempt_at=None, locked_until=None)
        )

    # kick dispatcher
    from celery_app import celery_app

    celery_app.send_task("events.dispatch", args=[50])
    return {"ok": True, "message": "Event scheduled for redelivery"}

