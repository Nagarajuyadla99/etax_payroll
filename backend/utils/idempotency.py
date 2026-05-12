from __future__ import annotations

import hashlib
import json
from typing import Any, Awaitable, Callable, Optional
from uuid import UUID

from fastapi import Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from models.idempotency_models import ApiIdempotencyKey

_IDEMPOTENCY_ORG_SENTINEL = UUID("00000000-0000-0000-0000-000000000000")


def _stable_hash(payload: Any) -> str:
    # Canonical JSON, sorted keys, stable separators
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def idempotency_replay_or_none(
    *,
    db: AsyncSession,
    organisation_id,
    key: str | None,
    method: str,
    path: str,
    payload_dict: Any,
) -> Optional[dict]:
    if not key:
        return None

    req_hash = _stable_hash(payload_dict)
    try:
        res = await db.execute(
            select(ApiIdempotencyKey).where(
                ApiIdempotencyKey.organisation_id == organisation_id,
                ApiIdempotencyKey.key == key,
            )
        )
    except ProgrammingError:
        return None
    row = res.scalar_one_or_none()
    if not row:
        return None

    # Same key must not be reused for a different payload
    if row.request_hash != req_hash:
        raise HTTPException(
            status_code=409,
            detail="Idempotency-Key reuse with different payload",
        )

    return {
        "__idempo__": True,
        "status_code": int(row.status_code),
        "data": row.response_json,
    }


async def idempotency_store(
    *,
    db: AsyncSession,
    organisation_id,
    key: str | None,
    method: str,
    path: str,
    payload_dict: Any,
    status_code: int,
    response_json: dict,
) -> None:
    if not key:
        return

    req_hash = _stable_hash(payload_dict)
    obj = ApiIdempotencyKey(
        organisation_id=organisation_id,
        key=str(key),
        method=str(method).upper(),
        path=str(path),
        request_hash=req_hash,
        status_code=int(status_code),
        response_json=response_json or {},
    )
    db.add(obj)
    try:
        await db.commit()
    except ProgrammingError:
        await db.rollback()
    except Exception:
        # best-effort: do not break the API response if idempotency store fails
        await db.rollback()


async def require_idempotency_key(
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> str:
    key = (idempotency_key or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required")
    return key


async def idempotent_execute(
    *,
    request: Request,
    db: AsyncSession,
    idempotency_key: str,
    endpoint: str,
    body: Any,
    exec_fn: Callable[[], Awaitable[tuple[int, Any]]],
) -> tuple[int, Any]:
    scoped_key = f"{endpoint}:{idempotency_key}"
    replay = await idempotency_replay_or_none(
        db=db,
        organisation_id=_IDEMPOTENCY_ORG_SENTINEL,
        key=scoped_key,
        method=request.method,
        path=request.url.path,
        payload_dict=body,
    )
    if replay:
        return int(replay["status_code"]), replay["data"]

    status_code, payload = await exec_fn()
    await idempotency_store(
        db=db,
        organisation_id=_IDEMPOTENCY_ORG_SENTINEL,
        key=scoped_key,
        method=request.method,
        path=request.url.path,
        payload_dict=body,
        status_code=status_code,
        response_json=payload if isinstance(payload, dict) else {"data": payload},
    )
    return status_code, payload
