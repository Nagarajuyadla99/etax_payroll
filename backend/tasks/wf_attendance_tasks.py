"""Celery tasks for workforce attendance recompute."""

from __future__ import annotations

import asyncio
from uuid import UUID

from celery_app import celery_app
from database import AsyncSessionLocal
from services.wf_recompute_service import process_recompute_job


def _run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@celery_app.task(name="wf.recompute_job", bind=True, max_retries=3)
def run_recompute_job_task(self, job_id: str) -> dict:
    async def _inner():
        async with AsyncSessionLocal() as db:
            job = await process_recompute_job(db, UUID(job_id))
            return {"job_id": str(job.job_id), "status": job.status, "stats": job.stats_json}

    try:
        return _run_async(_inner())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
