from __future__ import annotations

from prometheus_client import Counter, Histogram

PAYOUT_ENQUEUED = Counter(
    "banking_payout_enqueued_total",
    "Salary batch payout enqueue attempts",
    ["result"],
)

BANK_FILE_GENERATED = Counter(
    "banking_file_generated_total",
    "Bank salary files generated",
    ["result"],
)

WEBHOOK_RECEIVED = Counter(
    "banking_webhook_received_total",
    "Payment provider webhooks received",
    ["provider", "result"],
)

PAYOUT_SYNC = Counter(
    "banking_payout_sync_total",
    "Provider payout status sync operations",
    ["outcome"],
)

PAYOUT_TASK_DURATION = Histogram(
    "banking_payout_task_seconds",
    "Celery payout task duration",
    buckets=(0.5, 1, 2, 5, 10, 30, 60, 120),
)

PROVIDER_API_LATENCY = Histogram(
    "banking_provider_api_seconds",
    "Provider API call latency",
    ["operation"],
    buckets=(0.1, 0.25, 0.5, 1, 2, 5, 10, 30),
)

STUCK_PAYOUT_GAUGE = Counter(
    "banking_stuck_payout_batches_total",
    "Stuck payout batches detected",
)


def inc_payout_enqueued() -> None:
    PAYOUT_ENQUEUED.labels(result="ok").inc()


def inc_payout_enqueue_conflict() -> None:
    PAYOUT_ENQUEUED.labels(result="conflict").inc()


def inc_bank_file_generated() -> None:
    BANK_FILE_GENERATED.labels(result="ok").inc()


def inc_webhook(provider: str, *, ok: bool, replay: bool = False) -> None:
    result = "replay" if replay else ("ok" if ok else "error")
    WEBHOOK_RECEIVED.labels(provider=provider, result=result).inc()


def inc_payout_sync(outcome: str) -> None:
    PAYOUT_SYNC.labels(outcome=outcome).inc()
