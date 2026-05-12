from __future__ import annotations

import os

from celery import Celery


def make_payroll_celery() -> Celery:
    broker = os.getenv("PAYROLL_CELERY_BROKER_URL") or os.getenv(
        "CELERY_BROKER_URL", "redis://localhost:6379/2"
    )
    backend = os.getenv("PAYROLL_CELERY_RESULT_BACKEND") or os.getenv(
        "CELERY_RESULT_BACKEND", broker
    )
    app = Celery(
        "payroll",
        broker=broker,
        backend=backend,
        include=["payroll.tasks"],
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone=os.getenv("CELERY_TIMEZONE", "UTC"),
        enable_utc=True,
        task_track_started=True,
        broker_connection_retry_on_startup=True,
        task_acks_late=True,
        worker_prefetch_multiplier=int(os.getenv("PAYROLL_CELERY_PREFETCH", "1")),
    )
    return app


celery_app = make_payroll_celery()
