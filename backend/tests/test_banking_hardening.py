from __future__ import annotations

import os
from decimal import Decimal
from uuid import uuid4

import pytest

from services.payout_sync_service import map_provider_status_to_item_status, recompute_batch_status_from_items
from utils.artifact_download_token import build_artifact_download_token, verify_artifact_download_token
from utils.webhook_security import webhook_client_allowed


class _Batch:
    def __init__(self, status: str):
        self.batch_id = uuid4()
        self.status = status


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeDB:
    def __init__(self, statuses):
        self._statuses = statuses

    async def execute(self, _query):
        return _FakeResult([(s,) for s in self._statuses])

    async def flush(self):
        pass


def test_map_provider_status():
    assert map_provider_status_to_item_status("processed") == "success"
    assert map_provider_status_to_item_status("reversed") == "failed"
    assert map_provider_status_to_item_status("queued") == "pending"


@pytest.mark.asyncio
async def test_recompute_partial_success_failed():
    batch = _Batch("payout_in_progress")
    db = _FakeDB(["success", "failed"])
    await recompute_batch_status_from_items(db, batch)
    assert batch.status == "failed"


@pytest.mark.asyncio
async def test_recompute_all_success_paid():
    batch = _Batch("payout_in_progress")
    db = _FakeDB(["success", "success"])
    await recompute_batch_status_from_items(db, batch)
    assert batch.status == "paid"


def test_webhook_allowlist_empty_allows_all():
    old = os.environ.pop("RAZORPAYX_WEBHOOK_ALLOW_IPS", None)
    try:
        assert webhook_client_allowed("203.0.113.1") is True
    finally:
        if old is not None:
            os.environ["RAZORPAYX_WEBHOOK_ALLOW_IPS"] = old


def test_webhook_allowlist_blocks_unknown(monkeypatch):
    monkeypatch.setenv("RAZORPAYX_WEBHOOK_ALLOW_IPS", "127.0.0.1")
    assert webhook_client_allowed("10.0.0.1") is False
    assert webhook_client_allowed("127.0.0.1") is True


def test_artifact_download_token_roundtrip(monkeypatch):
    monkeypatch.setenv("ARTIFACT_DOWNLOAD_SECRET", "test-secret-key")
    batch_id = uuid4()
    artifact_id = uuid4()
    token = build_artifact_download_token(batch_id=batch_id, artifact_id=artifact_id, ttl_seconds=3600)
    assert verify_artifact_download_token(batch_id=batch_id, artifact_id=artifact_id, token=token)
