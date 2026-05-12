from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from utils.request_context import RequestContext, set_request_context


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        correlation_id = request.headers.get("X-Correlation-Id") or request_id

        ip = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")

        set_request_context(
            RequestContext(
                request_id=request_id,
                correlation_id=correlation_id,
                ip_address=ip,
                user_agent=user_agent,
            )
        )

        response: Response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        response.headers["X-Correlation-Id"] = correlation_id
        return response

