"""Redis: Celery broker companion keys (locks + idempotency + orchestration counters)."""

from __future__ import annotations

import os
from typing import Optional
from uuid import UUID

_redis = None


def get_redis():
    global _redis
    if _redis is not None:
        return _redis
    try:
        import redis
    except ImportError as e:
        raise RuntimeError("redis package required for payroll Redis features") from e

    url = os.getenv("REDIS_URL", os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1"))
    _redis = redis.Redis.from_url(url, decode_responses=True)
    return _redis


def payroll_exec_lock_key(payroll_run_id: UUID) -> str:
    return f"payroll:exec_lock:{payroll_run_id}"


def payroll_remaining_key(payroll_run_id: UUID) -> str:
    return f"payroll:run:{payroll_run_id}:remaining"


def payroll_idempotency_key(organisation_id: UUID, input_fingerprint: str) -> str:
    return f"payroll:idempo:{organisation_id}:{input_fingerprint}"


def try_acquire_payroll_run_lock(payroll_run_id: UUID, ttl_seconds: int = 7200) -> bool:
    r = get_redis()
    return bool(r.set(payroll_exec_lock_key(payroll_run_id), "1", nx=True, ex=ttl_seconds))


def release_payroll_run_lock(payroll_run_id: UUID) -> None:
    get_redis().delete(payroll_exec_lock_key(payroll_run_id))


def idempotency_get_run_id(organisation_id: UUID, input_fingerprint: str) -> Optional[str]:
    return get_redis().get(payroll_idempotency_key(organisation_id, input_fingerprint))


def idempotency_set_run_id(
    organisation_id: UUID,
    input_fingerprint: str,
    payroll_run_id: UUID,
    ttl_seconds: int = 86400 * 7,
) -> bool:
    """SET if absent — returns True if set, False if key already mapped."""
    r = get_redis()
    key = payroll_idempotency_key(organisation_id, input_fingerprint)
    ok = r.set(key, str(payroll_run_id), nx=True, ex=ttl_seconds)
    return bool(ok)


def init_remaining_counter(payroll_run_id: UUID, n: int) -> None:
    if n <= 0:
        return
    k = payroll_remaining_key(payroll_run_id)
    r = get_redis()
    r.set(k, str(n), ex=86400)


def decrement_remaining_and_should_finalize(payroll_run_id: UUID) -> bool:
    """DECR remaining; return True if this worker should enqueue aggregate (hit zero)."""
    r = get_redis()
    k = payroll_remaining_key(payroll_run_id)
    left = r.decr(k)
    return left == 0


def clear_remaining_counter(payroll_run_id: UUID) -> None:
    get_redis().delete(payroll_remaining_key(payroll_run_id))
