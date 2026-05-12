from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from services.workflow_service import select_workflow_for_salary_batch


class _FakeScalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)


class _FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return _FakeScalars(self._items)


class _FakeDB:
    async def execute(self, _query):
        return _FakeResult([])


@pytest.mark.asyncio
async def test_select_workflow_defaults_when_none():
    org_id = uuid4()
    sel = await select_workflow_for_salary_batch(_FakeDB(), organisation_id=org_id, total_amount=Decimal("0"))
    assert sel.workflow_code == "DEFAULT"

