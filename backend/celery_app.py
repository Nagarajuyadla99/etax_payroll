from __future__ import annotations

import os

from celery import Celery
from kombu import Exchange, Queue


def make_celery() -> Celery:
    broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    result_backend = os.getenv("CELERY_RESULT_BACKEND", broker_url)

    app = Celery(
        "etax_payroll",
        broker=broker_url,
        backend=result_backend,
        include=[
            "tasks.payout_tasks",
            "tasks.reconciliation_tasks",
            "tasks.event_tasks",
            "tasks.banking_ops_tasks",
        ],
    )

    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone=os.getenv("TZ", "Asia/Kolkata"),
        enable_utc=True,
        task_track_started=True,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,
        broker_connection_retry_on_startup=True,
        broker_connection_max_retries=10,
        task_default_queue="default",
        task_queues=(
            Queue("payouts", Exchange("payouts"), routing_key="payouts"),
            Queue("webhooks", Exchange("webhooks"), routing_key="webhooks"),
            Queue("reconciliation", Exchange("reconciliation"), routing_key="reconciliation"),
            Queue("banking_ops", Exchange("banking_ops"), routing_key="banking_ops"),
            Queue("default", Exchange("default"), routing_key="default"),
        ),
        task_routes={
            "payout.*": {"queue": "payouts"},
            "reconciliation.*": {"queue": "reconciliation"},
            "banking.*": {"queue": "banking_ops"},
            "events.*": {"queue": "default"},
        },
    )

    if os.getenv("ENABLE_EVENTS_BEAT", "false").lower() == "true":
        interval = int(os.getenv("EVENTS_DISPATCH_INTERVAL_SECONDS", "60"))
        app.conf.beat_schedule = {
            "events-dispatch": {
                "task": "events.dispatch",
                "schedule": float(max(10, interval)),
                "args": (50,),
            },
        }

    if os.getenv("ENABLE_BANKING_BEAT", "false").lower() == "true":
        stuck_mins = int(os.getenv("BANKING_STUCK_PAYOUT_MINUTES", "60"))
        recon_hour = int(os.getenv("BANKING_DAILY_RECON_HOUR_UTC", "2"))
        app.conf.beat_schedule = {
            **(app.conf.beat_schedule or {}),
            "banking-detect-stuck-payouts": {
                "task": "banking.detect_stuck_payouts",
                "schedule": float(max(300, int(os.getenv("BANKING_STUCK_CHECK_SECONDS", "900")))),
                "args": (stuck_mins,),
            },
            "reconciliation-daily-import-scan": {
                "task": "reconciliation.daily_exception_scan",
                "schedule": 86400.0,
                "kwargs": {"lookback_hours": 24},
            },
        }

    return app


celery_app = make_celery()
