from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Bank(Base):
    __tablename__ = "banks"
    __table_args__ = (
        UniqueConstraint("code", name="ux_banks_code"),
    )

    bank_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code = Column(String(30), nullable=False)  # e.g. bank internal code / shortname
    name = Column(Text, nullable=False)
    swift_code = Column(String(20))
    country = Column(String(100), nullable=False, server_default=text("'India'"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    branches = relationship("BankBranch", back_populates="bank", cascade="all, delete-orphan")


class BankBranch(Base):
    __tablename__ = "bank_branches"
    __table_args__ = (
        UniqueConstraint("ifsc_code", name="ux_bank_branches_ifsc_code"),
    )

    branch_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    bank_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("banks.bank_id", ondelete="CASCADE"),
        nullable=False,
    )
    branch_name = Column(Text, nullable=False)
    ifsc_code = Column(String(20), nullable=True)  # India; allow null for non-IFSC countries
    micr_code = Column(String(20))
    swift_code = Column(String(20))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), nullable=False, server_default=text("'India'"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    bank = relationship("Bank", back_populates="branches")


class BankTransferMode(Base):
    """
    Transfer modes enabled for an organisation, optionally scoped to a bank.
    Examples: NEFT, RTGS, IMPS, UPI.
    """

    __tablename__ = "bank_transfer_modes"
    __table_args__ = (
        UniqueConstraint("organisation_id", "bank_id", "mode", name="ux_transfer_modes_org_bank_mode"),
    )

    mode_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    bank_id = Column(PGUUID(as_uuid=True), ForeignKey("banks.bank_id", ondelete="CASCADE"))
    mode = Column(String(20), nullable=False)  # NEFT/RTGS/IMPS/UPI
    is_enabled = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class CompanySalaryAccount(Base):
    __tablename__ = "company_salary_accounts"
    __table_args__ = (
        UniqueConstraint("organisation_id", "is_default", name="ux_company_salary_accounts_org_default"),
    )

    company_account_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    bank_branch_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("bank_branches.branch_id", ondelete="RESTRICT"),
        nullable=False,
    )
    account_holder_name = Column(Text, nullable=False)

    # Encrypted fields will be implemented in Phase-1 employee-bank todo; schema is created now.
    account_number_enc = Column(Text, nullable=False)
    account_number_last4 = Column(String(4), nullable=False)

    account_type = Column(String(30), nullable=True)
    allowed_modes = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    is_default = Column(Boolean, nullable=False, server_default=text("false"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    branch = relationship("BankBranch")


class BankFileFormat(Base):
    __tablename__ = "bank_file_formats"
    __table_args__ = (
        UniqueConstraint("organisation_id", "bank_code", "name", name="ux_bank_file_format_org_bank_name"),
    )

    format_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    bank_code = Column(String(20), nullable=False)
    bank_name = Column(String(150))
    name = Column(String(150), nullable=False)
    file_type = Column(String(10), nullable=False, server_default=text("'CSV'"))  # CSV/TXT/XML
    header_line = Column(Text)
    data_line_config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
