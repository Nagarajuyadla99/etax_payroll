from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from services.disbursement_workflow import finance_approval_allowed, finance_step_done, hr_step_done
from services.workflow_service import recompute_batch_status_from_approvals
from utils.currency_inr import decimal_to_paise


class _Batch:
    def __init__(self, status: str = "hr_pending"):
        self.batch_id = uuid4()
        self.organisation_id = uuid4()
        self.status = status


class _ApprovalRow:
    def __init__(self, step: str, status: str):
        self.step = step
        self.status = status


class _FakeScalars:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeDB:
    def __init__(self, rows):
        self._rows = rows

    async def execute(self, _query):
        return _FakeResult(self._rows)


@pytest.mark.asyncio
async def test_recompute_sets_finance_pending_after_hr():
    batch = _Batch(status="hr_pending")
    db = _FakeDB([("HR", "approved"), ("FINANCE", "pending")])
    await recompute_batch_status_from_approvals(db, batch=batch)
    assert batch.status == "finance_pending"


@pytest.mark.asyncio
async def test_recompute_sets_approved_when_all_steps_done():
    batch = _Batch(status="finance_pending")
    db = _FakeDB([("HR", "approved"), ("FINANCE", "approved")])
    await recompute_batch_status_from_approvals(db, batch=batch)
    assert batch.status == "approved"


@pytest.mark.asyncio
async def test_recompute_does_not_downgrade_payout_in_progress():
    batch = _Batch(status="payout_in_progress")
    db = _FakeDB([("HR", "approved"), ("FINANCE", "pending")])
    await recompute_batch_status_from_approvals(db, batch=batch)
    assert batch.status == "payout_in_progress"


def test_finance_approval_allowed_after_hr():
    batch = _Batch(status="hr_pending")
    snapshot = {"hr_approved": True, "finance_approved": False}
    assert finance_approval_allowed(batch, snapshot) is True


def test_finance_approval_blocked_before_hr():
    batch = _Batch(status="hr_pending")
    snapshot = {"hr_approved": False, "finance_approved": False}
    assert finance_approval_allowed(batch, snapshot) is False


def test_decimal_to_paise():
    assert decimal_to_paise(Decimal("50000.50")) == 5000050
    assert decimal_to_paise(Decimal("100")) == 10000


def test_finance_step_done_helper():
    assert finance_step_done({"finance_approved": True}) is True
    assert hr_step_done({"hr_approved": True}) is True
