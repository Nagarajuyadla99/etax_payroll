from __future__ import annotations

from prometheus_client import Counter, Histogram


REQUEST_COUNT = Counter(
    "api_requests_total",
    "Total API requests",
    ["method", "path", "status"],
)

REQUEST_LATENCY = Histogram(
    "api_request_latency_seconds",
    "API request latency",
    ["method", "path"],
)

PAYOUT_QUEUED = Counter("payout_queued_total", "Payouts queued", ["result"])

