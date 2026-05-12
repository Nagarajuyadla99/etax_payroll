from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, String, Text, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class ProviderBeneficiary(Base):
    __tablename__ = "provider_beneficiaries"
    __table_args__ = (
        UniqueConstraint("provider_code", "employee_bank_account_id", name="ux_provider_beneficiary_account"),
    )

    provider_beneficiary_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    provider_code = Column(String(30), nullable=False)
    employee_id = Column(PGUUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    employee_bank_account_id = Column(PGUUID(as_uuid=True), ForeignKey("employee_bank_accounts.bank_account_id", ondelete="CASCADE"), nullable=False)
    provider_ref = Column(String(120), nullable=False)  # provider beneficiary / fund_account id
    sync_status = Column(String(30), nullable=False, server_default=text("'pending'"))
    verification_status = Column(String(30), nullable=False, server_default=text("'unknown'"))
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, nullable=False, server_default=text("true"))


class ProviderPayout(Base):
    __tablename__ = "provider_payouts"
    __table_args__ = (
        UniqueConstraint("provider_code", "provider_payout_ref", name="ux_provider_payout_ref"),
        UniqueConstraint("salary_batch_item_id", name="ux_provider_payout_item"),
    )

    provider_payout_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    provider_code = Column(String(30), nullable=False)
    salary_batch_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batches.batch_id", ondelete="CASCADE"), nullable=False)
    salary_batch_item_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batch_items.item_id", ondelete="CASCADE"), nullable=False)
    provider_beneficiary_ref = Column(String(120), nullable=False)
    provider_payout_ref = Column(String(120), nullable=False)
    status = Column(String(30), nullable=False, server_default=text("'queued'"))
    utr = Column(String(120))
    settlement_id = Column(String(120))
    failure_reason = Column(Text)
    raw = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    __table_args__ = (
        UniqueConstraint("provider_code", "event_id", name="ux_webhook_event_provider_id"),
    )

    webhook_event_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    provider_code = Column(String(30), nullable=False)
    event_id = Column(String(120), nullable=False)
    event_type = Column(String(120))
    signature_valid = Column(Boolean, nullable=False, server_default=text("false"))
    payload = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    received_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    processed_at = Column(TIMESTAMP(timezone=True))
    process_status = Column(String(30), nullable=False, server_default=text("'received'"))  # received/processed/failed
    failure_reason = Column(Text)

