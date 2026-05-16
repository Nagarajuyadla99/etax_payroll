from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TypeVar

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


async def commit_writes(db: AsyncSession) -> None:
    """Commit the request-scoped session when a transaction is open."""
    if db.in_transaction():
        await db.commit()


async def rollback_writes(db: AsyncSession) -> None:
    if db.in_transaction():
        await db.rollback()


async def run_writes(
    db: AsyncSession,
    fn: Callable[[], Awaitable[T]],
) -> T:
    """
    Run write logic on a session that may already be in a transaction
    (e.g. after auth or idempotency lookups). Do not call db.begin() here.
    """
    try:
        result = await fn()
        await commit_writes(db)
        return result
    except HTTPException:
        await rollback_writes(db)
        raise
