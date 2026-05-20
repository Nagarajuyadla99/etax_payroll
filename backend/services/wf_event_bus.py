"""Formalized WF domain event bus (outbox via domain_events)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_enterprise_models import WF_EVENT_TYPES, WfDeadLetterEvent
from services.wf_domain_event_service import publish_wf_event as _publish
from services.wf_observability_service import record_metric


async def publish_wf_domain_event(
    db: AsyncSession,
    organisation_id: UUID,
    event_type: str,
    payload: dict[str, Any],
    *,
    dedupe_key: str,
    correlation_id: str | None = None,
) -> None:
    if event_type not in WF_EVENT_TYPES:
        record_metric("wf_event_unknown_type", 1, {"type": event_type})
    try:
        await _publish(db, organisation_id, event_type, payload, dedupe_key=dedupe_key, correlation_id=correlation_id)
        record_metric("wf_event_published", 1, {"type": event_type})
    except Exception as exc:
        db.add(
            WfDeadLetterEvent(
                organisation_id=organisation_id,
                event_type=event_type,
                payload_json=payload,
                error_message=str(exc)[:500],
                attempts=1,
            )
        )
        record_metric("wf_event_dlq", 1, {"type": event_type})
        raise
