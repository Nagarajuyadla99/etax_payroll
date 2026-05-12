from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.idempotency_models import ApiIdempotencyKey


def _stable_json_hash(payload: object) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def build_request_hash(*, method: str, url_path: str, query: dict, body: object | None) -> str:
    return _stable_json_hash(
        {
            "method": method.upper(),
            "path": url_path,
            "query": query,
            "body": body,
        }
    )


async def idempotency_get_or_reserve(
    db: AsyncSession,
    *,
    idempotency_key: str,
    endpoint: str,
    request_hash: str,
    ttl_seconds: int = 24 * 60 * 60,
) -> ApiIdempotencyKey | None:
    """
    Returns:
      - existing record if key already used (caller should return cached response)
      - None if reserved successfully (caller proceeds and later stores response)
    """
    now = datetime.now(tz=timezone.utc)

    res = await db.execute(
        select(ApiIdempotencyKey).where(
            ApiIdempotencyKey.idempotency_key == idempotency_key,
            ApiIdempotencyKey.endpoint == endpoint,
        )
    )
    existing = res.scalar_one_or_none()
    if existing:
        if existing.request_hash != request_hash:
            raise HTTPException(status_code=409, detail="Idempotency-Key reuse with different payload is not allowed")
        # expired: treat as not found
        if existing.expires_at <= now:
            return None
        return existing

    expires_at = now + timedelta(seconds=ttl_seconds)
    db.add(
        ApiIdempotencyKey(
            idempotency_key=idempotency_key,
            endpoint=endpoint,
            request_hash=request_hash,
            response_payload=None,
            response_status=None,
            expires_at=expires_at,
        )
    )
    # caller controls transaction boundary
    return None


async def idempotency_store_response(
    db: AsyncSession,
    *,
    idempotency_key: str,
    endpoint: str,
    request_hash: str,
    response_status: int,
    response_payload: object,
) -> None:
    res = await db.execute(
        select(ApiIdempotencyKey).where(
            ApiIdempotencyKey.idempotency_key == idempotency_key,
            ApiIdempotencyKey.endpoint == endpoint,
        )
    )
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=500, detail="Idempotency record missing")
    if rec.request_hash != request_hash:
        raise HTTPException(status_code=409, detail="Idempotency-Key payload mismatch")
    rec.response_status = str(response_status)
    rec.response_payload = response_payload


async def idempotency_cleanup_expired(db: AsyncSession) -> int:
    from sqlalchemy import delete

    now = datetime.now(tz=timezone.utc)
    result = await db.execute(delete(ApiIdempotencyKey).where(ApiIdempotencyKey.expires_at <= now))
    return int(result.rowcount or 0)

