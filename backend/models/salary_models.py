# payroll_system/models/salary_models.py

from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    TIMESTAMP,
    SmallInteger,
    UniqueConstraint,
    ForeignKey,
    Numeric,
    CheckConstraint,
    text,
    Date,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base


# --------------------------------------------------------------------
# SALARY COMPONENTS
# --------------------------------------------------------------------
class SalaryComponent(Base):
    __tablename__ = "salary_components"

    __table_args__ = (
        UniqueConstraint("organisation_id", "name", name="ux_salarycomponents_org_name"),
    )

    component_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()")
    )

    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    code = Column(String(50))
    name = Column(Text, nullable=False)
    description = Column(Text)

    component_type = Column(String(50), nullable=False)
    calc_type = Column(String(20), nullable=False, server_default=text("'fixed'"))

    percentage_of = Column(String(100))
    formula = Column(Text)

    rounding = Column(Numeric(10, 4), server_default=text("0"))

    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    is_taxable = Column(Boolean, nullable=False, server_default=text("true"))
    is_pf_applicable = Column(Boolean, nullable=False, server_default=text("false"))
    is_allowance = Column(Boolean, nullable=False, server_default=text("false"))
    is_loan_related = Column(Boolean, nullable=False, server_default=text("false"))

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    template_components = relationship(
        "SalaryTemplateComponent",
        back_populates="component"
    )


# --------------------------------------------------------------------
# SALARY TEMPLATE
# --------------------------------------------------------------------
class SalaryTemplate(Base):
    __tablename__ = "salary_templates"

    __table_args__ = (
        UniqueConstraint("organisation_id", "name", name="ux_salarytemplates_org_name"),
    )

    template_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()")
    )

    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(String(150), nullable=False)
    description = Column(Text)

    is_default = Column(Boolean, nullable=False, server_default=text("false"))

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    components = relationship(
        "SalaryTemplateComponent",
        back_populates="template",
        cascade="all, delete-orphan"
    )

    pay_structures = relationship(
        "PayStructure",
        back_populates="template"
    )


# --------------------------------------------------------------------
# SALARY TEMPLATE COMPONENTS
# --------------------------------------------------------------------
class SalaryTemplateComponent(Base):
    __tablename__ = "salary_template_components"

    __table_args__ = (
        UniqueConstraint("template_id", "component_id", name="ux_stc_template_component"),
        CheckConstraint(
            "percentage IS NULL OR (percentage >= 0 AND percentage <= 100)",
            name="chk_percentage_range"
        ),
    )

    stc_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()")
    )

    template_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_templates.template_id", ondelete="CASCADE"),
        nullable=False,
    )

    component_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_components.component_id", ondelete="RESTRICT"),
        nullable=False,
    )

    sequence = Column(SmallInteger, nullable=False, server_default=text("1"))

    amount = Column(Numeric(18, 4), nullable=True)
    percentage = Column(Numeric(6, 3), nullable=True)

# ✅ ADD THESE
    percentage_of = Column(String(100), nullable=True)
    formula = Column(Text, nullable=True)

    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    template = relationship("SalaryTemplate", back_populates="components")
    component = relationship("SalaryComponent", back_populates="template_components")
   
# --------------------------------------------------------------------
# PAY STRUCTURES
# --------------------------------------------------------------------
class PayStructure(Base):
    __tablename__ = "pay_structures"

    __table_args__ = (
        UniqueConstraint("organisation_id", "name", name="ux_paystructures_org_name"),
    )

    pay_structure_id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()")
    )

    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(String(150), nullable=False)

    template_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_templates.template_id", ondelete="RESTRICT"),
        nullable=False,
    )

    effective_from = Column(Date)
    effective_to = Column(Date)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    template = relationship("SalaryTemplate", back_populates="pay_structures")


# --------------------------------------------------------------------
# EMPLOYEE SALARY STRUCTURE
# --------------------------------------------------------------------
class EmployeeSalaryStructure(Base):
    __tablename__ = "employee_salary_structures"

    __table_args__ = (
        UniqueConstraint("employee_id", "effective_from", name="ux_employee_salary_effective"),
    )

    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()")
    )

    employee_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("employees.employee_id", ondelete="CASCADE"),
        nullable=False
    )

    template_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_templates.template_id"),
        nullable=False
    )
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    ctc = Column(Numeric(18,2))
    effective_from = Column(Date)

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    template = relationship("SalaryTemplate")