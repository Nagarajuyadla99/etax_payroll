"""Canonical JSON serialization for payroll fingerprints (deterministic hashing)."""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any
from uuid import UUID


def _normalize(o: Any) -> Any:
    if o is None or isinstance(o, (bool, str)):
        return o
    if isinstance(o, Decimal):
        return format(o, "f")
    if isinstance(o, UUID):
        return str(o)
    if isinstance(o, dict):
        return {str(k): _normalize(v) for k, v in sorted(o.items(), key=lambda kv: str(kv[0]))}
    if isinstance(o, (list, tuple)):
        return [_normalize(x) for x in o]
    return str(o)


def stable_json_hash(payload: Any) -> str:
    raw = json.dumps(_normalize(payload), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
