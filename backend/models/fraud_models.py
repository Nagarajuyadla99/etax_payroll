from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Integer, Numeric, String, Text, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class FraudRule(Base):
    __tablename__ = "fraud_rules"
    __table_args__ = (UniqueConstraint("organisation_id", "code", name="ux_fraud_rules_org_code"),)

    rule_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    code = Column(String(60), nullable=False)  # DUPLICATE_PAYOUT, SALARY_SPIKE, RAPID_BANK_CHANGE, etc.
    name = Column(String(150), nullable=False)
    description = Column(Text)
    severity = Column(String(20), nullable=False, server_default=text("'medium'"))  # low/medium/high/critical
    config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    alert_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    rule_code = Column(String(60), nullable=False)

    severity = Column(String(20), nullable=False)  # low/medium/high/critical
    status = Column(String(20), nullable=False, server_default=text("'open'"))  # open/ack/resolved/ignored

    employee_id = Column(PGUUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="SET NULL"))
    salary_batch_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batches.batch_id", ondelete="SET NULL"))
    salary_batch_item_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batch_items.item_id", ondelete="SET NULL"))
    provider_payout_id = Column(PGUUID(as_uuid=True), ForeignKey("provider_payouts.provider_payout_id", ondelete="SET NULL"))

    title = Column(Text, nullable=False)
    details = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    acknowledged_at = Column(TIMESTAMP(timezone=True))
    acknowledged_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    resolved_at = Column(TIMESTAMP(timezone=True))
    resolved_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    resolution_note = Column(Text)


class RiskScore(Base):
    __tablename__ = "risk_scores"
    __table_args__ = (
        UniqueConstraint("organisation_id", "entity_type", "entity_id", name="ux_risk_score_entity"),
    )

    risk_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(30), nullable=False)  # salary_batch / salary_batch_item / provider_payout
    entity_id = Column(PGUUID(as_uuid=True), nullable=False)

    score = Column(Integer, nullable=False, server_default=text("0"))  # 0-100
    band = Column(String(20), nullable=False, server_default=text("'low'"))  # low/medium/high/critical
    signals = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

