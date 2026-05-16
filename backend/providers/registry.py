from __future__ import annotations

import os
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from providers.base.provider import BankingProvider
from services.provider_config_service import (
    build_provider,
    credentials_from_env,
    get_provider_for_organisation,
)


def get_provider() -> BankingProvider:
    """Env-only provider (backward compatible). Prefer get_provider_for_organisation in workers."""
    creds = credentials_from_env(os.getenv("BANKING_PROVIDER") or "razorpayx")
    return build_provider(creds)


async def resolve_provider(
    db: AsyncSession,
    organisation_id: UUID | None = None,
) -> BankingProvider:
    if organisation_id is not None:
        return await get_provider_for_organisation(db, organisation_id)
    return get_provider()
