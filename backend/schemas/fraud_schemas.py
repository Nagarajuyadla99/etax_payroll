from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class FraudAlertOut(BaseModel):
    alert_id: UUID
    organisation_id: UUID
    rule_code: str
    severity: str
    status: str
    employee_id: UUID | None = None
    salary_batch_id: UUID | None = None
    salary_batch_item_id: UUID | None = None
    provider_payout_id: UUID | None = None
    title: str
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    acknowledged_at: datetime | None = None
    acknowledged_by: UUID | None = None
    resolved_at: datetime | None = None
    resolved_by: UUID | None = None
    resolution_note: str | None = None

    class Config:
        from_attributes = True


class FraudAlertStatusUpdate(BaseModel):
    status: str  # ack/resolved/ignored
    resolution_note: str | None = None


class FraudRuleOut(BaseModel):
    rule_id: UUID
    organisation_id: UUID
    code: str
    name: str
    description: str | None = None
    severity: str
    config: dict[str, Any] = Field(default_factory=dict)
    is_active: bool

    class Config:
        from_attributes = True


class FraudRuleUpsert(BaseModel):
    code: str
    name: str
    description: str | None = None
    severity: str = "medium"
    config: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

