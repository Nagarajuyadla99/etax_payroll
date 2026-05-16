from __future__ import annotations

import json
from uuid import uuid4

import pytest

from services.bank_file_plugins.registry import get_bank_file_plugin
from services.bank_file_plugins.base import BankFileRow
from services.payout_audit_service import _seal_hash
from utils.celery_dedup import acquire_task_slot, release_task_slot
from decimal import Decimal


def test_bank_file_plugins_sbi_icici_hdfc():
    row = BankFileRow(
        employee_id=str(uuid4()),
        account_number="1234567890",
        ifsc="SBIN0001234",
        amount=Decimal("1000.00"),
        account_holder_name="Test User",
    )
    for code in ("SBI", "ICICI", "HDFC", "DEFAULT"):
        plugin = get_bank_file_plugin(code)
        result = plugin.build([row], config={})
        assert result.lines
        assert result.validation_report.get("plugin") or code == "DEFAULT"


def test_audit_seal_deterministic():
    payload = {"action": "test", "amount": "100"}
    assert _seal_hash(payload) == _seal_hash(payload)
    assert _seal_hash(payload) != _seal_hash({**payload, "x": 1})


def test_celery_dedup_slot(monkeypatch):
    class _FakeRedis:
        def __init__(self):
            self.store = {}

        def set(self, key, val, nx=False, ex=None):
            if nx and key in self.store:
                return False
            self.store[key] = val
            return True

        def delete(self, key):
            self.store.pop(key, None)

    fake = _FakeRedis()
    monkeypatch.setattr("utils.celery_dedup._client", lambda: fake)
    assert acquire_task_slot("test-task-1") is True
    assert acquire_task_slot("test-task-1") is False
    release_task_slot("test-task-1")
    assert acquire_task_slot("test-task-1") is True


def test_provider_credentials_pack_unpack(monkeypatch):
    monkeypatch.setenv("ENCRYPTION_KEYS", "1:" + "A" * 44)  # invalid - need proper key
    pytest.importorskip("cryptography")
    import base64
    key = base64.urlsafe_b64encode(b"x" * 32).decode()
    monkeypatch.setenv("ENCRYPTION_KEYS", f"1:{key}")
    monkeypatch.setenv("ENCRYPTION_ACTIVE_KEY_VERSION", "1")
    from services.provider_config_service import _pack_credentials, _unpack_credentials

    blob = _pack_credentials({"key_id": "k", "key_secret": "s"})
    data = _unpack_credentials(blob)
    assert data["key_id"] == "k"
