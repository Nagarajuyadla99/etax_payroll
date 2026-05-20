"""Ops metrics (requirement P4): queue, recompute, ingest latency, DLQ, worker health."""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Any

logger = logging.getLogger(__name__)

_COUNTERS: dict[str, float] = defaultdict(float)
_GAUGES: dict[str, float] = {}


def record_metric(name: str, value: float = 1.0, labels: dict[str, Any] | None = None) -> None:
    key = name
    if labels:
        key = f"{name}:{','.join(f'{k}={v}' for k, v in sorted(labels.items()))}"
    _COUNTERS[key] += value


def record_gauge(name: str, value: float, labels: dict[str, Any] | None = None) -> None:
    key = name
    if labels:
        key = f"{name}:{','.join(f'{k}={v}' for k, v in sorted(labels.items()))}"
    _GAUGES[key] = value


def record_ingest_latency(latency_ms: float) -> None:
    record_gauge("wf_punch_ingest_latency_ms", latency_ms)
    record_metric("wf_punch_ingested", 1)


def record_recompute_job(status: str, item_count: int = 0) -> None:
    record_metric("wf_recompute_jobs", 1, {"status": status})
    if item_count:
        record_metric("wf_recompute_items", float(item_count), {"status": status})


def record_queue_enqueue(queue_name: str) -> None:
    record_metric("wf_queue_enqueued", 1, {"queue": queue_name})


def snapshot_metrics() -> dict[str, Any]:
    return {
        "counters": dict(_COUNTERS),
        "gauges": dict(_GAUGES),
    }


def queue_metrics() -> dict[str, float]:
    return {k: v for k, v in _COUNTERS.items() if k.startswith("wf_queue")}


def worker_health_snapshot() -> dict[str, Any]:
    """Best-effort Celery worker probe (P4)."""
    try:
        from celery_app import celery_app

        insp = celery_app.control.inspect(timeout=1.0)
        ping = insp.ping() if insp else None
        active = insp.active() if insp else None
        return {
            "status": "ok" if ping else "degraded",
            "workers": list(ping.keys()) if ping else [],
            "active_tasks": sum(len(v) for v in (active or {}).values()),
        }
    except Exception as exc:
        return {"status": "unknown", "error": str(exc)[:200]}


async def persist_metrics_snapshot(db, organisation_id=None) -> int:
    """Optional DB persist — batch insert WfOpsMetric."""
    from models.wf_enterprise_models import WfOpsMetric
    from uuid import UUID as _UUID

    count = 0
    merged = {**_COUNTERS, **_GAUGES}
    for key, val in list(merged.items()):
        parts = key.split(":", 1)
        name = parts[0]
        db.add(
            WfOpsMetric(
                organisation_id=_UUID(str(organisation_id)) if organisation_id else None,
                metric_name=name[:80],
                metric_value=val,
                labels_json={"key": key},
            )
        )
        count += 1
    if count:
        await db.flush()
    return count
