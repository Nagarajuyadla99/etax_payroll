from __future__ import annotations

import base64
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _b64decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s.encode("utf-8"))


def _b64encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8")


def _load_master_keys() -> dict[int, bytes]:
    """
    Versioned keys:
      ENCRYPTION_KEYS="1:<b64>,2:<b64>"
      ENCRYPTION_ACTIVE_KEY_VERSION="2"
    Back-compat:
      ENCRYPTION_MASTER_KEY="<b64>" is treated as version 1.
    """
    keys_raw = os.getenv("ENCRYPTION_KEYS", "").strip()
    if keys_raw:
        out: dict[int, bytes] = {}
        for part in keys_raw.split(","):
            part = part.strip()
            if not part:
                continue
            ver_s, b64 = part.split(":", 1)
            ver = int(ver_s.strip())
            key = _b64decode(b64.strip())
            if len(key) != 32:
                raise RuntimeError(f"ENCRYPTION_KEYS version {ver} must decode to 32 bytes")
            out[ver] = key
        if not out:
            raise RuntimeError("ENCRYPTION_KEYS provided but empty")
        return out

    # legacy
    raw = os.getenv("ENCRYPTION_MASTER_KEY")
    if not raw:
        raise RuntimeError("Missing ENCRYPTION_MASTER_KEY or ENCRYPTION_KEYS env var")
    key = _b64decode(raw)
    if len(key) != 32:
        raise RuntimeError("ENCRYPTION_MASTER_KEY must decode to 32 bytes")
    return {1: key}


def _active_key_version(keys: dict[int, bytes]) -> int:
    raw = os.getenv("ENCRYPTION_ACTIVE_KEY_VERSION")
    if raw:
        v = int(raw)
        if v not in keys:
            raise RuntimeError("ENCRYPTION_ACTIVE_KEY_VERSION not present in ENCRYPTION_KEYS")
        return v
    return max(keys.keys())


def _load_key(version: int | None) -> tuple[int, bytes]:
    """
    Returns (version, key_bytes). If version is None, uses active version.
    """
    keys = _load_master_keys()
    if version is None:
        v = _active_key_version(keys)
        return v, keys[v]
    if version not in keys:
        raise RuntimeError(f"Unknown encryption key version: {version}")
    return version, keys[version]


@dataclass(frozen=True)
class EncryptedValue:
    key_version: int
    nonce_b64: str
    ciphertext_b64: str


def encrypt_text(plaintext: str, *, aad: str | None = None, key_version: int | None = None) -> EncryptedValue:
    if plaintext is None or plaintext == "":
        raise ValueError("plaintext cannot be empty")
    v, key = _load_key(key_version)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    aad_b = aad.encode("utf-8") if aad else None
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), aad_b)
    return EncryptedValue(key_version=v, nonce_b64=_b64encode(nonce), ciphertext_b64=_b64encode(ct))


def decrypt_text(nonce_b64: str, ciphertext_b64: str, *, aad: str | None = None, key_version: int | None = None) -> str:
    _, key = _load_key(key_version or 1)
    aesgcm = AESGCM(key)
    nonce = _b64decode(nonce_b64)
    ct = _b64decode(ciphertext_b64)
    aad_b = aad.encode("utf-8") if aad else None
    pt = aesgcm.decrypt(nonce, ct, aad_b)
    return pt.decode("utf-8")


def mask_account_number(account_number: str) -> tuple[str, str]:
    """
    Returns (masked, last4). Masking is display-only and must not be used for auth.
    """
    if not account_number or len(account_number) < 4:
        raise ValueError("account_number must be at least 4 chars")
    last4 = account_number[-4:]
    masked = ("*" * max(len(account_number) - 4, 0)) + last4
    return masked, last4

