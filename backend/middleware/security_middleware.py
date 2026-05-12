from __future__ import annotations

import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from utils.rate_limiter import rate_limit_or_429


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Request size limit (bytes)
        max_bytes = int(os.getenv("MAX_REQUEST_BYTES", "1048576"))  # 1MB default
        cl = request.headers.get("content-length")
        if cl and cl.isdigit() and int(cl) > max_bytes:
            return Response("Request too large", status_code=413)

        path = request.url.path
        ip = request.client.host if request.client else "unknown"

        # Auth brute-force protection
        if path.startswith("/api/auth/login") or path.startswith("/api/auth/login-unified"):
            rate_limit_or_429(key=f"auth:{ip}", limit=10, window_seconds=60)

        # Money movement + approvals: stricter
        if "/disbursement/" in path:
            rate_limit_or_429(key=f"disb:{ip}", limit=60, window_seconds=60)

        return await call_next(request)

