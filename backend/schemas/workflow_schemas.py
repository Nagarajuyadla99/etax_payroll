from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkflowStepOut(BaseModel):
    step_id: UUID
    workflow_id: UUID
    order_index: int
    step_code: str
    role: str
    require_all: bool
    sla_hours: int
    min_amount: float | None = None
    max_amount: float | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class WorkflowOut(BaseModel):
    workflow_id: UUID
    organisation_id: UUID
    entity_type: str
    code: str
    name: str
    description: str | None = None
    routing_rule: dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class WorkflowUpsert(BaseModel):
    entity_type: str = "salary_batch"
    code: str
    name: str
    description: str | None = None
    routing_rule: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class WorkflowStepUpsert(BaseModel):
    order_index: int
    step_code: str
    role: str
    require_all: bool = True
    sla_hours: int = 24
    min_amount: float | None = None
    max_amount: float | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class DelegationOut(BaseModel):
    delegation_id: UUID
    organisation_id: UUID
    delegator_user_id: UUID
    delegate_user_id: UUID
    entity_type: str
    step_code: str | None = None
    reason: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DelegationCreate(BaseModel):
    delegator_user_id: UUID
    delegate_user_id: UUID
    entity_type: str = "salary_batch"
    step_code: str | None = None
    reason: str | None = None
    ends_at: datetime | None = None
    is_active: bool = True


class ApprovalDecisionIn(BaseModel):
    decision: str  # approve/reject
    comment: str | None = None
    decision_token: str

