from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.notification_models import Notification


async def create_notification(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    user_id: UUID,
    kind: str,
    title: str,
    body: str | None = None,
    data: dict | None = None,
) -> Notification:
    n = Notification(
        organisation_id=organisation_id,
        user_id=user_id,
        kind=kind,
        title=title,
        body=body,
        data=data or {},
    )
    db.add(n)
    await db.flush()
    return n

