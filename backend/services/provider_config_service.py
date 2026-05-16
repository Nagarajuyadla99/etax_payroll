"""
Per-organisation banking provider credentials (encrypted at rest).
Falls back to process env when no active DB config exists.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.provider_config_models import BankingProviderConfig, ProviderHealthLog
from providers.base.provider import BankingProvider
from providers.razorpayx.provider import RazorpayXProvider
from utils.encryption import decrypt_text, encrypt_text


@dataclass(frozen=True)
class ProviderCredentials:
    provider_code: str
    key_id: str
    key_secret: str
    webhook_secret: str
    source_account: str
    base_url: str
    is_sandbox: bool
    config_id: UUID | None = None


def _pack_credentials(creds: dict[str, str]) -> str:
    enc = encrypt_text(json.dumps(creds), aad="banking_provider_credentials")
    return json.dumps(
        {
            "key_version": enc.key_version,
            "nonce_b64": enc.nonce_b64,
            "ciphertext_b64": enc.ciphertext_b64,
        }
    )


def _unpack_credentials(blob: str) -> dict[str, str]:
    wrapper = json.loads(blob)
    plain = decrypt_text(
        wrapper["nonce_b64"],
        wrapper["ciphertext_b64"],
        aad="banking_provider_credentials",
        key_version=int(wrapper.get("key_version") or 1),
    )
    return json.loads(plain)


def credentials_from_env(provider_code: str) -> ProviderCredentials:
    code = provider_code.lower()
    if code != "razorpayx":
        raise RuntimeError(f"Unsupported provider: {provider_code}")
    return ProviderCredentials(
        provider_code=code,
        key_id=os.getenv("RAZORPAYX_KEY_ID", ""),
        key_secret=os.getenv("RAZORPAYX_KEY_SECRET", ""),
        webhook_secret=os.getenv("RAZORPAYX_WEBHOOK_SECRET", ""),
        source_account=os.getenv("RAZORPAYX_SOURCE_ACCOUNT", ""),
        base_url=os.getenv("RAZORPAYX_BASE_URL", "https://api.razorpay.com"),
        is_sandbox=os.getenv("RAZORPAYX_SANDBOX", "true").lower() == "true",
        config_id=None,
    )


async def load_active_provider_credentials(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    provider_code: str | None = None,
) -> ProviderCredentials:
    code = (provider_code or os.getenv("BANKING_PROVIDER") or "razorpayx").lower()
    res = await db.execute(
        select(BankingProviderConfig).where(
            BankingProviderConfig.organisation_id == organisation_id,
            BankingProviderConfig.provider_code == code,
            BankingProviderConfig.is_active.is_(True),
        )
    )
    row = res.scalar_one_or_none()
    if not row:
        return credentials_from_env(code)

    creds = _unpack_credentials(row.credentials_enc)
    webhook_secret = ""
    if row.webhook_secret_enc:
        webhook_secret = _unpack_credentials(row.webhook_secret_enc).get("secret", "")

    return ProviderCredentials(
        provider_code=code,
        key_id=creds.get("key_id", ""),
        key_secret=creds.get("key_secret", ""),
        webhook_secret=webhook_secret or creds.get("webhook_secret", ""),
        source_account=creds.get("source_account", ""),
        base_url=creds.get("base_url", os.getenv("RAZORPAYX_BASE_URL", "https://api.razorpay.com")),
        is_sandbox=bool(row.is_sandbox),
        config_id=row.config_id,
    )


async def upsert_provider_config(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    provider_code: str,
    key_id: str,
    key_secret: str,
    source_account: str,
    webhook_secret: str | None = None,
    base_url: str | None = None,
    is_sandbox: bool = True,
    is_active: bool = True,
    rotate: bool = False,
) -> BankingProviderConfig:
    code = provider_code.lower()
    creds_blob = _pack_credentials(
        {
            "key_id": key_id,
            "key_secret": key_secret,
            "source_account": source_account,
            "base_url": base_url or os.getenv("RAZORPAYX_BASE_URL", "https://api.razorpay.com"),
            **({"webhook_secret": webhook_secret} if webhook_secret else {}),
        }
    )
    webhook_blob = (
        _pack_credentials({"secret": webhook_secret}) if webhook_secret else None
    )

    res = await db.execute(
        select(BankingProviderConfig).where(
            BankingProviderConfig.organisation_id == organisation_id,
            BankingProviderConfig.provider_code == code,
        )
    )
    row = res.scalar_one_or_none()
    if row and not rotate:
        row.credentials_enc = creds_blob
        if webhook_blob:
            row.webhook_secret_enc = webhook_blob
        row.is_sandbox = is_sandbox
        row.is_active = is_active
    elif row and rotate:
        meta = dict(row.meta or {})
        versions = list(meta.get("credential_versions", []))
        versions.append({"rotated_at": time.time(), "previous_active": row.is_active})
        meta["credential_versions"] = versions[-10:]
        row.credentials_enc = creds_blob
        if webhook_blob:
            row.webhook_secret_enc = webhook_blob
        row.meta = meta
        row.is_active = is_active
    else:
        row = BankingProviderConfig(
            organisation_id=organisation_id,
            provider_code=code,
            credentials_enc=creds_blob,
            webhook_secret_enc=webhook_blob,
            is_sandbox=is_sandbox,
            is_active=is_active,
            meta={},
        )
        db.add(row)
    await db.flush()
    return row


def build_provider(creds: ProviderCredentials) -> BankingProvider:
    if creds.provider_code == "razorpayx":
        return RazorpayXProvider(
            key_id=creds.key_id,
            key_secret=creds.key_secret,
            webhook_secret=creds.webhook_secret,
            source_account=creds.source_account,
            base_url=creds.base_url,
        )
    raise RuntimeError(f"Unsupported provider: {creds.provider_code}")


async def get_provider_for_organisation(
    db: AsyncSession,
    organisation_id: UUID,
    *,
    provider_code: str | None = None,
) -> BankingProvider:
    creds = await load_active_provider_credentials(
        db, organisation_id=organisation_id, provider_code=provider_code
    )
    return build_provider(creds)


async def check_provider_health(
    db: AsyncSession,
    *,
    organisation_id: UUID,
    provider_code: str | None = None,
) -> dict[str, Any]:
    creds = await load_active_provider_credentials(
        db, organisation_id=organisation_id, provider_code=provider_code
    )
    started = time.perf_counter()
    ok = False
    err: str | None = None
    try:
        if not creds.key_id or not creds.key_secret:
            raise ValueError("credentials_missing")
        async with httpx.AsyncClient(
            base_url=creds.base_url.rstrip("/"),
            auth=(creds.key_id, creds.key_secret),
            timeout=10.0,
        ) as client:
            r = await client.get("/v1/payments", params={"count": 1})
            ok = r.status_code < 500
            if r.status_code >= 400:
                err = f"http_{r.status_code}"
    except Exception as e:
        err = str(e)
    latency_ms = int((time.perf_counter() - started) * 1000)
    db.add(
        ProviderHealthLog(
            organisation_id=organisation_id,
            provider_code=creds.provider_code,
            ok=ok,
            latency_ms=str(latency_ms),
            error=err,
            meta={"source": "api_ping", "config_id": str(creds.config_id) if creds.config_id else None},
        )
    )
    await db.flush()
    return {
        "ok": ok,
        "provider_code": creds.provider_code,
        "latency_ms": latency_ms,
        "error": err,
        "credential_source": "database" if creds.config_id else "environment",
    }
