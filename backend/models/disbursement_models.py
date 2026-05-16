from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class SalaryBatch(Base):
    __tablename__ = "salary_batches"
    __table_args__ = (
        UniqueConstraint("organisation_id", "payroll_run_id", name="ux_salary_batch_org_run"),
    )

    batch_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    payroll_run_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("payroll_runs.payroll_run_id", ondelete="RESTRICT"),
        nullable=False,
    )
    pay_period_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("pay_periods.pay_period_id", ondelete="RESTRICT"),
        nullable=False,
    )
    batch_ref = Column(String(50), nullable=False)
    total_employees = Column(Integer, nullable=False, server_default=text("0"))
    total_amount = Column(Numeric(18, 4), nullable=False, server_default=text("0"))

    status = Column(
        String(30),
        nullable=False,
        server_default=text("'draft'"),
    )  # draft/hr_pending/finance_pending/approved/payout_in_progress/paid/failed/held/cancelled

    # bank_file | api — set on first disbursement action; mutually exclusive
    disbursement_mode = Column(String(20), nullable=True)
    disbursement_locked_at = Column(TIMESTAMP(timezone=True), nullable=True)
    payout_job_id = Column(String(64), nullable=True)

    created_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    items = relationship("SalaryBatchItem", back_populates="batch", cascade="all, delete-orphan")
    approvals = relationship("Approval", back_populates="batch", cascade="all, delete-orphan")
    artifacts = relationship("PaymentArtifact", back_populates="batch", cascade="all, delete-orphan")


class SalaryBatchItem(Base):
    __tablename__ = "salary_batch_items"
    __table_args__ = (
        UniqueConstraint("batch_id", "employee_id", name="ux_salary_batch_item_batch_employee"),
    )

    item_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    batch_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_batches.batch_id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount = Column(Numeric(18, 4), nullable=False)

    employee_bank_account_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("employee_bank_accounts.bank_account_id", ondelete="RESTRICT"),
        nullable=True,
    )

    status = Column(String(20), nullable=False, server_default=text("'pending'"))  # pending/success/failed/held
    payout_ref = Column(Text)
    failure_reason = Column(Text)
    attempts = Column(Integer, nullable=False, server_default=text("0"))
    last_attempt_at = Column(TIMESTAMP(timezone=True))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    batch = relationship("SalaryBatch", back_populates="items")
    employee = relationship("Employee")
    bank_account = relationship("EmployeeBankAccount")


class Approval(Base):
    __tablename__ = "approvals"
    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "step", name="ux_approval_entity_step"),
    )

    approval_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    entity_type = Column(String(50), nullable=False)  # salary_batch
    entity_id = Column(PGUUID(as_uuid=True), nullable=False)

    step = Column(String(20), nullable=False)  # HR/FINANCE (Treasury later)
    status = Column(String(20), nullable=False, server_default=text("'pending'"))  # pending/approved/rejected
    actor_user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    decided_at = Column(TIMESTAMP(timezone=True))
    comment = Column(Text)

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Phase 2D: workflow-driven approvals (non-breaking additions)
    workflow_code = Column(String(50), nullable=False, server_default=text("'DEFAULT'"))
    order_index = Column(Integer, nullable=False, server_default=text("1"))
    parallel_group = Column(String(50))  # approvals with same group can be parallel
    due_at = Column(TIMESTAMP(timezone=True))
    decision_token = Column(String(80))  # replay protection for approval actions
    decided_by_delegation_id = Column(PGUUID(as_uuid=True), ForeignKey("approval_delegations.delegation_id", ondelete="SET NULL"))

    batch_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batches.batch_id", ondelete="CASCADE"))
    batch = relationship("SalaryBatch", back_populates="approvals")


class PaymentArtifact(Base):
    __tablename__ = "payment_artifacts"
    __table_args__ = (
        UniqueConstraint("batch_id", "kind", "version", name="ux_payment_artifact_batch_kind_version"),
    )

    artifact_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    batch_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_batches.batch_id", ondelete="CASCADE"),
        nullable=False,
    )

    kind = Column(String(30), nullable=False)  # bank_file
    format = Column(String(10), nullable=False)  # csv/txt/xml
    version = Column(Integer, nullable=False, server_default=text("1"))
    storage_path = Column(Text, nullable=False)
    sha256 = Column(String(64), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    batch = relationship("SalaryBatch", back_populates="artifacts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="SET NULL"))
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    action = Column(String(200), nullable=False)
    entity = Column(String(100))
    entity_id = Column(PGUUID(as_uuid=True))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    details = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    occurred_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

