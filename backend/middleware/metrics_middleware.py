from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from services.metrics_service import REQUEST_COUNT, REQUEST_LATENCY


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start

        # Keep labels low-cardinality (path template is not available here);
        # use raw path but trim high-variance UUID segments in later iterations.
        path = request.url.path
        method = request.method

        REQUEST_COUNT.labels(method=method, path=path, status=str(response.status_code)).inc()
        REQUEST_LATENCY.labels(method=method, path=path).observe(elapsed)
        return response

