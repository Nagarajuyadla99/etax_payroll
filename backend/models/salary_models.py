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
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
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

    # Phase 2 (V2) fields (additive). These co-exist with legacy columns below.
    # They are used by /api/salary/v2/* endpoints and migrations are additive/idempotent.
    component_category = Column(String(30))
    calculation_type = Column(String(20))
    formula_expression = Column(Text)
    system_code = Column(String(30))
    rounding_rule = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

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

    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

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

    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

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
    # Phase 2 additive: per-employee overrides used by v2 payroll orchestration.
    overrides = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    template = relationship("SalaryTemplate")


# --------------------------------------------------------------------
# PHASE 2 (V2) — Additive Models (non-breaking)
# --------------------------------------------------------------------
class SalaryComponentGroup(Base):
    __tablename__ = "salary_component_groups"

    group_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    code = Column(String(50), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organisation_id", "code", name="ux_salary_component_groups_org_code"),
    )

    items = relationship("SalaryComponentGroupItem", back_populates="group", cascade="all, delete-orphan")


class SalaryComponentGroupItem(Base):
    __tablename__ = "salary_component_group_items"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    group_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_component_groups.group_id", ondelete="CASCADE"), nullable=False)
    component_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_components.component_id", ondelete="RESTRICT"), nullable=False)
    sequence = Column(SmallInteger, nullable=False, server_default=text("1"))

    __table_args__ = (
        UniqueConstraint("group_id", "component_id", name="ux_salary_component_group_items_group_component"),
    )

    group = relationship("SalaryComponentGroup", back_populates="items")
    component = relationship("SalaryComponent")


class SalaryDerivedVariable(Base):
    __tablename__ = "salary_derived_variables"

    variable_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    code = Column(String(50), nullable=False)
    name = Column(Text, nullable=False)
    expression = Column(Text, nullable=False)
    data_type = Column(String(10), nullable=False, server_default=text("'number'"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organisation_id", "code", name="ux_salary_derived_variables_org_code"),
    )


class OrgStatutoryConfig(Base):
    __tablename__ = "org_statutory_configs"

    config_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )

    statutory_code = Column(String(20), nullable=False)
    is_enabled = Column(Boolean, nullable=False, server_default=text("true"))
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    settings = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organisation_id", "statutory_code", "effective_from", name="ux_org_statutory_configs_org_code_from"),
        CheckConstraint("effective_to IS NULL OR effective_to >= effective_from", name="ck_org_statutory_configs_effective_range"),
    )


class SalaryTemplateGroup(Base):
    __tablename__ = "salary_template_groups"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    template_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_templates.template_id", ondelete="CASCADE"), nullable=False)
    group_id = Column(PGUUID(as_uuid=True), ForeignKey("salary_component_groups.group_id", ondelete="RESTRICT"), nullable=False)
    sequence = Column(SmallInteger, nullable=False, server_default=text("1"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("template_id", "group_id", name="ux_salary_template_groups_template_group"),
    )