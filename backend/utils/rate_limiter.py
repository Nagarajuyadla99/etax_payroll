from __future__ import annotations

import os
import time

import redis
from fastapi import HTTPException


def _redis_client() -> redis.Redis:
    url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://localhost:6379/0"
    return redis.from_url(url, decode_responses=True)


_r = None


def _get_r() -> redis.Redis:
    global _r
    if _r is None:
        _r = _redis_client()
    return _r


def rate_limit_or_429(*, key: str, limit: int, window_seconds: int) -> None:
    """
    Fixed-window limiter: INCR + EXPIRE.
    """
    try:
        r = _get_r()
        now = int(time.time())
        window = now // window_seconds
        k = f"rl:{key}:{window}"
        n = r.incr(k, 1)
        if n == 1:
            r.expire(k, window_seconds)
        if n > limit:
            raise HTTPException(status_code=429, detail="Too many requests")
    except redis.exceptions.RedisError:
        # Fail-open: rate limiting is a safety layer, not an availability dependency.
        # When Redis is down (common in local dev), we allow the request to proceed.
        return

