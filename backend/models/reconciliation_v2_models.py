from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Numeric, String, Text, TIMESTAMP, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class BankTransaction(Base):
    __tablename__ = "bank_transactions"
    __table_args__ = (
        UniqueConstraint("organisation_id", "import_id", "row_index", name="ux_bank_txn_import_row"),
    )

    transaction_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    import_id = Column(PGUUID(as_uuid=True), ForeignKey("bank_statement_imports.import_id", ondelete="CASCADE"), nullable=False)
    row_index = Column(String(20), nullable=False)

    txn_date = Column(String(20), nullable=False)
    txn_type = Column(String(10), nullable=False, server_default=text("'DR'"))  # DR/CR
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(10), nullable=False, server_default=text("'INR'"))
    description = Column(Text)
    reference = Column(String(120))
    utr = Column(String(120))

    normalized = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class ReconciliationMatch(Base):
    __tablename__ = "reconciliation_matches"
    __table_args__ = (
        UniqueConstraint("transaction_id", name="ux_recon_match_txn"),
    )

    match_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(PGUUID(as_uuid=True), ForeignKey("bank_transactions.transaction_id", ondelete="CASCADE"), nullable=False)
    provider_payout_id = Column(PGUUID(as_uuid=True), ForeignKey("provider_payouts.provider_payout_id", ondelete="SET NULL"))
    salary_batch_item_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batch_items.item_id", ondelete="SET NULL"))

    match_type = Column(String(30), nullable=False)  # utr_exact/ref_exact/amount_date
    confidence = Column(Numeric(5, 2), nullable=False, server_default=text("100"))
    status = Column(String(30), nullable=False, server_default=text("'matched'"))  # matched/mismatch/duplicate/needs_review
    notes = Column(Text)
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class ReconciliationException(Base):
    __tablename__ = "reconciliation_exceptions"

    exception_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    import_id = Column(PGUUID(as_uuid=True), ForeignKey("bank_statement_imports.import_id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(PGUUID(as_uuid=True), ForeignKey("bank_transactions.transaction_id", ondelete="CASCADE"))

    kind = Column(String(50), nullable=False)  # unmatched/mismatch/duplicate_payout/utr_collision/amount_mismatch
    severity = Column(String(20), nullable=False, server_default=text("'medium'"))
    status = Column(String(20), nullable=False, server_default=text("'open'"))  # open/ack/resolved
    summary = Column(Text, nullable=False)
    details = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    resolved_at = Column(TIMESTAMP(timezone=True))
    resolution_note = Column(Text)
    resolved_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))

