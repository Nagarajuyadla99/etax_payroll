"""Attendance device registry and sync."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.wf_enterprise_models import AttendanceDevice, DeviceHealthLog, DeviceSyncLog
from services.wf_observability_service import record_metric


async def register_device(
    db: AsyncSession,
    organisation_id: UUID,
    terminal_code: str,
    device_type: str = "biometric",
    **kwargs: Any,
) -> AttendanceDevice:
    dev = AttendanceDevice(
        organisation_id=organisation_id,
        terminal_code=terminal_code,
        device_type=device_type,
        location=kwargs.get("location"),
        config_json=kwargs.get("config_json") or {},
    )
    db.add(dev)
    await db.commit()
    await db.refresh(dev)
    return dev


async def record_device_sync(
    db: AsyncSession,
    device_id: UUID,
    *,
    events_received: int,
    events_accepted: int,
    latency_ms: int | None = None,
    error: str | None = None,
) -> DeviceSyncLog:
    dev = await db.get(AttendanceDevice, device_id)
    if dev:
        dev.last_sync_at = datetime.now(timezone.utc)
        dev.health_status = "healthy" if not error else "degraded"
    log = DeviceSyncLog(
        device_id=device_id,
        events_received=events_received,
        events_accepted=events_accepted,
        latency_ms=latency_ms,
        error_message=error,
    )
    db.add(log)
    if dev:
        db.add(DeviceHealthLog(device_id=device_id, status=dev.health_status, details_json={"sync": True}))
    await db.commit()
    record_metric("wf_device_sync_latency_ms", float(latency_ms or 0), {})
    record_metric("wf_punch_ingest_count", float(events_accepted), {})
    return log


async def list_devices(db: AsyncSession, organisation_id: UUID) -> list[AttendanceDevice]:
    res = await db.execute(
        select(AttendanceDevice).where(AttendanceDevice.organisation_id == organisation_id)
    )
    return list(res.scalars().all())
