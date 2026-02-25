# payroll_system/models/salary_models.py
import uuid
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
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base  # Changed to absolute import for clarity


# --------------------------------------------------------------------
# SALARY COMPONENTS
# --------------------------------------------------------------------
class SalaryComponent(Base):
    __tablename__ = "salary_components"
    __table_args__ = (
        UniqueConstraint("organisation_id", "name", name="ux_salarycomponents_org_name"),
    )

    component_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    code = Column(String(50))
    name = Column(Text, nullable=False)
    description = Column(Text)
    component_type = Column(String(50), nullable=False)  # ENUM: component_type_t
    is_active = Column(Boolean, nullable=False, server_default=text("true"))
    calc_type = Column(String(20), nullable=False, server_default=text("'fixed'"))  # ENUM: calc_type_t
    percentage_of = Column(String(100))
    rounding = Column(Numeric(10, 4), server_default=text("0"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    template_components = relationship("SalaryTemplateComponent", back_populates="component")


# --------------------------------------------------------------------
# SALARY TEMPLATE
# --------------------------------------------------------------------
class SalaryTemplate(Base):
    __tablename__ = "salary_templates"
    __table_args__ = (
        UniqueConstraint("organisation_id", "name", name="ux_salarytemplates_org_name"),
    )

    template_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(150), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    components = relationship("SalaryTemplateComponent", back_populates="template", cascade="all, delete-orphan")
    pay_structures = relationship("PayStructure", back_populates="template")


# --------------------------------------------------------------------
# SALARY TEMPLATE COMPONENTS
# --------------------------------------------------------------------
class SalaryTemplateComponent(Base):
    __tablename__ = "salary_template_components"
    __table_args__ = (
        UniqueConstraint("template_id", "component_id", name="ux_stc_template_component"),
        CheckConstraint("percentage IS NULL OR (percentage >= 0 AND percentage <= 100)", name="chk_percentage_range"),
    )

    stc_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
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
    amount = Column(Numeric(18, 4), server_default=text("0"))
    percentage = Column(Numeric(6, 3))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    # Relationships
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

    pay_structure_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
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
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    template = relationship("SalaryTemplate", back_populates="pay_structures")