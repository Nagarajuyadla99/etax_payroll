"""Structured banking logs with correlation IDs."""

from __future__ import annotations

import json
import logging
import uuid
from contextvars import ContextVar
from typing import Any

_correlation_id: ContextVar[str | None] = ContextVar("banking_correlation_id", default=None)


def new_correlation_id() -> str:
    cid = str(uuid.uuid4())
    _correlation_id.set(cid)
    return cid


def get_correlation_id() -> str | None:
    return _correlation_id.get()


def set_correlation_id(cid: str | None) -> None:
    _correlation_id.set(cid)


def log_banking(
    logger: logging.Logger,
    event: str,
    *,
    level: int = logging.INFO,
    **fields: Any,
) -> None:
    payload = {
        "event": event,
        "domain": "banking",
        "correlation_id": get_correlation_id(),
        **{k: v for k, v in fields.items() if v is not None},
    }
    logger.log(level, json.dumps(payload, default=str))
