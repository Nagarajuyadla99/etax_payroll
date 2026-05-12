from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, String, Text, TIMESTAMP, text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.sql import func

from database import Base


class BankStatementImport(Base):
    __tablename__ = "bank_statement_imports"

    import_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    source = Column(String(50), nullable=False, server_default=text("'csv'"))
    original_filename = Column(Text)
    storage_path = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, server_default=text("'uploaded'"))  # uploaded/parsed/failed
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class BankReconciliationEntry(Base):
    __tablename__ = "bank_reconciliation_entries"
    __table_args__ = (
        UniqueConstraint("import_id", "row_index", name="ux_recon_import_row"),
    )

    entry_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    import_id = Column(PGUUID(as_uuid=True), ForeignKey("bank_statement_imports.import_id", ondelete="CASCADE"), nullable=False)
    row_index = Column(String(20), nullable=False)

    txn_date = Column(String(20))
    description = Column(Text)
    amount = Column(String(40))
    reference = Column(String(120))

    matched = Column(Boolean, nullable=False, server_default=text("false"))
    matched_batch_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batches.batch_id", ondelete="SET NULL"))
    matched_item_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_batch_items.item_id", ondelete="SET NULL"))
    recon_status = Column(String(30), nullable=False, server_default=text("'unmatched'"))  # unmatched/matched/mismatch
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

