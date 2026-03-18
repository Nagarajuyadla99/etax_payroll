# payroll_mangment/models/payroll_models.py
import uuid
from sqlalchemy import (
    Column,
    TIMESTAMP,
    Date,
    Text,
    Numeric,
    UniqueConstraint,
    ForeignKey,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID,  JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base  # Absolute import

# --------------------------------------------------------------------
# PAY PERIOD
# --------------------------------------------------------------------
class PayPeriod(Base):
    __tablename__ = "pay_periods"

    pay_period_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, server_default=text("'open'"))  # maps to payroll_status_t
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("organisation_id", "start_date", "end_date", name="ux_pay_periods_org_dates"),
    )


# --------------------------------------------------------------------
# PAYROLL RUN
# --------------------------------------------------------------------
class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    payroll_run_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    organisation_id = Column(PGUUID(as_uuid=True), ForeignKey("organisations.organisation_id", ondelete="CASCADE"), nullable=False)
    pay_period_id = Column(PGUUID(as_uuid=True), ForeignKey("pay_periods.pay_period_id", ondelete="CASCADE"), nullable=False)
    processed_by = Column(PGUUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    processed_at = Column(TIMESTAMP(timezone=True))
    status = Column(String(20), nullable=False, server_default=text("'draft'"))  # maps to run_status_t
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    gross_pay_total = Column(Numeric(18,2), server_default=text("0"))
    net_pay_total = Column(Numeric(18,2), server_default=text("0"))
    entries = relationship("PayrollEntry", back_populates="run", cascade="all, delete-orphan")


# --------------------------------------------------------------------
# PAYROLL ENTRY
# --------------------------------------------------------------------
class PayrollEntry(Base):
    __tablename__ = "payroll_entries"

    payroll_entry_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text('gen_random_uuid()'))
    payroll_run_id = Column(PGUUID(as_uuid=True), ForeignKey("payroll_runs.payroll_run_id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(PGUUID(as_uuid=True), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    component_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_components.component_id", ondelete="RESTRICT"), nullable=False)
    pay_period_id = Column(PGUUID(as_uuid=True), ForeignKey("pay_periods.pay_period_id", ondelete="RESTRICT"), nullable=False)
    amount = Column(Numeric(18,4), nullable=False)
    meta = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    run = relationship("PayrollRun", back_populates="entries")

    __table_args__ = (
    UniqueConstraint(
        "payroll_run_id",
        "employee_id",
        "component_id",
        name="ux_payrollentries_run_emp_comp"
    ),
)
    