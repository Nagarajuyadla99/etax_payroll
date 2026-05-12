from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Text, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class ApprovalWorkflow(Base):
    """
    Configurable approval workflow per organisation + entity type.
    Keeps us in a modular monolith without rewriting existing Approval rows.
    """

    __tablename__ = "approval_workflows"
    __table_args__ = (
        UniqueConstraint("organisation_id", "entity_type", "code", name="ux_workflow_org_entity_code"),
    )

    workflow_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    entity_type = Column(String(50), nullable=False)  # salary_batch, etc.
    code = Column(String(50), nullable=False)  # DEFAULT, HIGH_VALUE, ...
    name = Column(String(150), nullable=False)
    description = Column(Text)

    # simple routing rules stored as JSON to avoid premature DSL
    # ex: {"min_amount": 1000000, "department": "FINANCE"}
    routing_rule = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    steps = relationship("ApprovalWorkflowStep", back_populates="workflow", cascade="all, delete-orphan")


class ApprovalWorkflowStep(Base):
    __tablename__ = "approval_workflow_steps"
    __table_args__ = (
        UniqueConstraint("workflow_id", "step_code", name="ux_workflow_step_code"),
    )

    step_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    workflow_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("approval_workflows.workflow_id", ondelete="CASCADE"),
        nullable=False,
    )

    order_index = Column(Integer, nullable=False)  # 1..N sequencing. Same index means parallel group.
    step_code = Column(String(40), nullable=False)  # HR, FINANCE, TREASURY, etc.
    role = Column(String(20), nullable=False)  # admin/hr/finance

    # parallel approval behavior for this order_index group
    require_all = Column(Boolean, nullable=False, server_default=text("true"))

    sla_hours = Column(Integer, nullable=False, server_default=text("24"))
    min_amount = Column(Numeric(18, 4))
    max_amount = Column(Numeric(18, 4))
    config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    workflow = relationship("ApprovalWorkflow", back_populates="steps")


class ApprovalDelegation(Base):
    __tablename__ = "approval_delegations"
    __table_args__ = (
        UniqueConstraint("organisation_id", "delegator_user_id", "delegate_user_id", "entity_type", name="ux_delegation_unique"),
    )

    delegation_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    delegator_user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    delegate_user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(50), nullable=False, server_default=text("'salary_batch'"))
    step_code = Column(String(40))  # optional scoping: HR/FINANCE/...
    reason = Column(Text)
    starts_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    ends_at = Column(TIMESTAMP(timezone=True))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

