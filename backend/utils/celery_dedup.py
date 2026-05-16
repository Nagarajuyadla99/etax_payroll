"""Redis-backed Celery task deduplication (banking queues only)."""

from __future__ import annotations

import os
import time

import redis


def _client() -> redis.Redis:
    url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://localhost:6379/0"
    return redis.from_url(url, decode_responses=True)


def acquire_task_slot(key: str, *, ttl_seconds: int = 3600) -> bool:
    """Returns True if this worker may run the logical task."""
    try:
        r = _client()
        full = f"celery:dedup:{key}"
        return bool(r.set(full, str(time.time()), nx=True, ex=ttl_seconds))
    except Exception:
        return True


def release_task_slot(key: str) -> None:
    try:
        _client().delete(f"celery:dedup:{key}")
    except Exception:
        pass
