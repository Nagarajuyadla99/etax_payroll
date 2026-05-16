"""HMAC-signed short-lived tokens for bank file artifact downloads."""

from __future__ import annotations

import hashlib
import hmac
import os
import time
from uuid import UUID


def _secret() -> bytes:
    key = os.getenv("ARTIFACT_DOWNLOAD_SECRET") or os.getenv("SECRET_KEY") or ""
    if not key:
        raise RuntimeError("ARTIFACT_DOWNLOAD_SECRET or SECRET_KEY required for artifact downloads")
    return key.encode("utf-8")


def build_artifact_download_token(
    *,
    batch_id: UUID,
    artifact_id: UUID,
    ttl_seconds: int = 900,
) -> str:
    exp = int(time.time()) + ttl_seconds
    msg = f"{batch_id}:{artifact_id}:{exp}".encode("utf-8")
    sig = hmac.new(_secret(), msg, hashlib.sha256).hexdigest()
    return f"{exp}.{sig}"


def verify_artifact_download_token(
    *,
    batch_id: UUID,
    artifact_id: UUID,
    token: str,
) -> bool:
    try:
        exp_s, sig = token.split(".", 1)
        exp = int(exp_s)
    except (ValueError, AttributeError):
        return False
    if exp < int(time.time()):
        return False
    msg = f"{batch_id}:{artifact_id}:{exp}".encode("utf-8")
    expected = hmac.new(_secret(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)
