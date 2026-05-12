from __future__ import annotations

import os

from celery import Celery


def make_celery() -> Celery:
    broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    result_backend = os.getenv("CELERY_RESULT_BACKEND", broker_url)

    app = Celery(
        "etax_payroll",
        broker=broker_url,
        backend=result_backend,
        include=["tasks.payout_tasks", "tasks.reconciliation_tasks", "tasks.event_tasks"],
    )
    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone=os.getenv("TZ", "Asia/Kolkata"),
        enable_utc=True,
        task_track_started=True,
    )

    # Phase 2G: optional periodic dispatch via celery beat (opt-in).
    if os.getenv("ENABLE_EVENTS_BEAT", "false").lower() == "true":
        interval = int(os.getenv("EVENTS_DISPATCH_INTERVAL_SECONDS", "60"))
        app.conf.beat_schedule = {
            "events-dispatch": {
                "task": "events.dispatch",
                "schedule": float(max(10, interval)),
                "args": (50,),
            }
        }
    return app


celery_app = make_celery()

