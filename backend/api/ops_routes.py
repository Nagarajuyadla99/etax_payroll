from __future__ import annotations

import os

import redis
from fastapi import APIRouter
from sqlalchemy import text

from database import AsyncSessionLocal


router = APIRouter(prefix="/ops", tags=["Ops"])


async def _check_db() -> bool:
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def _check_redis() -> bool:
    try:
        url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://localhost:6379/0"
        r = redis.from_url(url)
        return bool(r.ping())
    except Exception:
        return False


@router.get("/readiness")
async def readiness():
    db_ok = await _check_db()
    redis_ok = _check_redis()
    status = "ok" if (db_ok and redis_ok) else "degraded"
    return {"status": status, "db": db_ok, "redis": redis_ok}


@router.get("/provider-health")
async def provider_health():
    """DB, Redis, and env-level provider config presence."""
    import os

    from providers.registry import get_provider

    provider = get_provider()
    ok = True
    problems = []

    if not _check_redis():
        ok = False
        problems.append("redis_unavailable")

    if not await _check_db():
        ok = False
        problems.append("db_unavailable")

    if provider.provider_code == "razorpayx":
        if not os.getenv("RAZORPAYX_KEY_ID") or not os.getenv("RAZORPAYX_KEY_SECRET"):
            problems.append("razorpayx_env_credentials_missing")
        if not os.getenv("RAZORPAYX_WEBHOOK_SECRET"):
            problems.append("razorpayx_webhook_secret_missing")

    return {"ok": ok, "provider": provider.provider_code, "problems": problems}

