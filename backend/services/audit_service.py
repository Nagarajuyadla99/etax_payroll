from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.disbursement_models import AuditLog
from utils.request_context import get_request_context


async def audit_log(
    db: AsyncSession,
    *,
    organisation_id: UUID | None,
    actor_id: UUID | None,
    actor_role: str | None,
    action: str,
    entity: str | None = None,
    entity_id: UUID | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    extra: dict[str, Any] | None = None,
) -> AuditLog:
    """
    Immutable structured audit log.
    Caller owns transaction boundary.
    """
    ctx = get_request_context()

    details: dict[str, Any] = {
        "request_id": ctx.request_id,
        "correlation_id": ctx.correlation_id,
        "actor_role": actor_role,
        "before": before or {},
        "after": after or {},
        "extra": extra or {},
    }

    log = AuditLog(
        organisation_id=organisation_id,
        user_id=actor_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
        details=details,
    )
    db.add(log)
    await db.flush()
    return log

