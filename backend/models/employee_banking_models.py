from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
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


class EmployeeBankAccount(Base):
    __tablename__ = "employee_bank_accounts"
    __table_args__ = (
        UniqueConstraint("employee_id", "effective_from", name="ux_emp_bank_effective_from"),
    )

    bank_account_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    employee_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False,
    )
    bank_branch_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bank_branches.branch_id", ondelete="RESTRICT"),
        nullable=False,
    )

    account_holder_name = Column(Text, nullable=False)

    # AES-256-GCM stored as base64 nonce + base64 ciphertext.
    key_version = Column(String(10), nullable=False, server_default=text("'1'"))
    account_number_nonce_b64 = Column(Text, nullable=False)
    account_number_ciphertext_b64 = Column(Text, nullable=False)
    account_number_last4 = Column(String(4), nullable=False)

    upi_vpa = Column(String(120))

    is_primary = Column(Boolean, nullable=False, server_default=text("false"))
    verification_status = Column(String(30), nullable=False, server_default=text("'pending_verification'"))
    verification_meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    verified_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    verified_at = Column(TIMESTAMP(timezone=True))

    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date)

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    employee = relationship("Employee")
    branch = relationship("BankBranch")
    documents = relationship("EmployeeBankAccountDocument", back_populates="bank_account", cascade="all, delete-orphan")


class EmployeeBankAccountDocument(Base):
    __tablename__ = "employee_bank_account_documents"
    __table_args__ = (
        UniqueConstraint("bank_account_id", "checksum_sha256", name="ux_emp_bank_doc_checksum"),
    )

    document_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    bank_account_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("employee_bank_accounts.bank_account_id", ondelete="CASCADE"),
        nullable=False,
    )
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    doc_type = Column(String(50), nullable=False)  # e.g. passbook/cancelled_cheque/bank_statement
    file_path = Column(Text, nullable=False)
    original_filename = Column(Text)
    content_type = Column(String(120))
    checksum_sha256 = Column(String(64), nullable=False)
    uploaded_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"))
    uploaded_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    bank_account = relationship("EmployeeBankAccount", back_populates="documents")

