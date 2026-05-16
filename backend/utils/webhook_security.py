from __future__ import annotations

import ipaddress
import os


def webhook_client_allowed(client_host: str | None, *, env_key: str = "RAZORPAYX_WEBHOOK_ALLOW_IPS") -> bool:
    """
    Optional IP allowlist (comma-separated CIDRs or IPs).
    Empty env = allow all (backward compatible for dev).
    """
    raw = (os.getenv(env_key) or "").strip()
    if not raw:
        return True
    if not client_host:
        return False
    try:
        addr = ipaddress.ip_address(client_host)
    except ValueError:
        return False
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            if "/" in part:
                if addr in ipaddress.ip_network(part, strict=False):
                    return True
            elif addr == ipaddress.ip_address(part):
                return True
        except ValueError:
            continue
    return False
