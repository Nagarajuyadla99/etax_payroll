"""Immutable-style payout audit trail (append-only via audit_logs)."""

from __future__ import annotations

import hashlib
import json
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from services.audit_service import audit_log


def _seal_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def seal_payout_audit(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    action: str,
    entity: str,
    entity_id: UUID,
    actor_id: UUID | None,
    actor_role: str | None,
    after: dict[str, Any],
    extra: dict[str, Any] | None = None,
) -> str:
    """Write audit row with tamper-evident seal hash in extra."""
    seal = _seal_hash({"action": action, "entity": entity, "entity_id": str(entity_id), "after": after})
    merged_extra = {**(extra or {}), "audit_seal": seal}
    await audit_log(
        db,
        organisation_id=organisation_id,
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity=entity,
        entity_id=entity_id,
        before=None,
        after=after,
        extra=merged_extra,
    )
    return seal
