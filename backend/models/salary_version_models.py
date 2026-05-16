"""Salary V2 effective-dated version rows (append-only history)."""

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

from database import Base


class SalaryComponentVersion(Base):
    __tablename__ = "salary_component_versions"

    version_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    component_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_components.component_id", ondelete="CASCADE"),
        nullable=False,
    )
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    code = Column(String(50))
    name = Column(Text, nullable=False)
    description = Column(Text)
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

    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    created_by_user_id = Column(PGUUID(as_uuid=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "effective_to IS NULL OR effective_to >= effective_from",
            name="ck_scv_effective_range",
        ),
    )


class SalaryDerivedVariableVersion(Base):
    __tablename__ = "salary_derived_variable_versions"

    version_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    variable_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_derived_variables.variable_id", ondelete="CASCADE"),
        nullable=False,
    )
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    code = Column(String(50), nullable=False)
    name = Column(Text, nullable=False)
    expression = Column(Text, nullable=False)
    data_type = Column(String(10), nullable=False, server_default=text("'number'"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    created_by_user_id = Column(PGUUID(as_uuid=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "effective_to IS NULL OR effective_to >= effective_from",
            name="ck_sdv_effective_range",
        ),
    )


class SalaryTemplateVersion(Base):
    __tablename__ = "salary_template_versions"

    template_version_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    template_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_templates.template_id", ondelete="CASCADE"),
        nullable=False,
    )
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    label = Column(String(200))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    created_by_user_id = Column(PGUUID(as_uuid=True), nullable=True)

    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    __table_args__ = (
        CheckConstraint(
            "effective_to IS NULL OR effective_to >= effective_from",
            name="ck_stv_effective_range",
        ),
    )


class SalaryTemplateComponentVersion(Base):
    __tablename__ = "salary_template_component_versions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    template_version_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_template_versions.template_version_id", ondelete="CASCADE"),
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
    percentage_of = Column(String(100))
    formula = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    meta = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    __table_args__ = (
        UniqueConstraint("template_version_id", "component_id", name="ux_stcv_tplver_component"),
    )


class SalaryTemplateGroupVersion(Base):
    __tablename__ = "salary_template_group_versions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    template_version_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_template_versions.template_version_id", ondelete="CASCADE"),
        nullable=False,
    )
    group_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_component_groups.group_id", ondelete="RESTRICT"),
        nullable=False,
    )
    sequence = Column(SmallInteger, nullable=False, server_default=text("1"))
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    __table_args__ = (
        UniqueConstraint("template_version_id", "group_id", name="ux_stgv_tplver_group"),
    )


class SalaryComponentGroupVersion(Base):
    __tablename__ = "salary_component_group_versions"

    group_version_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    group_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_component_groups.group_id", ondelete="CASCADE"),
        nullable=False,
    )
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    code = Column(String(50), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, server_default=text("true"))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    created_by_user_id = Column(PGUUID(as_uuid=True), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "effective_to IS NULL OR effective_to >= effective_from",
            name="ck_scgv_effective_range",
        ),
    )


class SalaryComponentGroupItemVersion(Base):
    __tablename__ = "salary_component_group_item_versions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    group_version_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_component_group_versions.group_version_id", ondelete="CASCADE"),
        nullable=False,
    )
    component_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_components.component_id", ondelete="RESTRICT"),
        nullable=False,
    )
    sequence = Column(SmallInteger, nullable=False, server_default=text("1"))

    __table_args__ = (
        UniqueConstraint("group_version_id", "component_id", name="ux_scgiv_ver_component"),
    )


class SalaryPreviewSnapshot(Base):
    __tablename__ = "salary_preview_snapshots"

    snapshot_id = Column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    trace_id = Column(PGUUID(as_uuid=True), nullable=False)
    organisation_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("organisations.organisation_id", ondelete="CASCADE"),
        nullable=False,
    )
    template_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_templates.template_id", ondelete="CASCADE"),
        nullable=False,
    )
    template_version_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("salary_template_versions.template_version_id", ondelete="SET NULL"),
        nullable=True,
    )
    as_of_date = Column(Date, nullable=False)
    ctc = Column(Numeric(18, 4), nullable=False)
    employee_id = Column(PGUUID(as_uuid=True), nullable=True)
    overrides = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    resolved_versions = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    resolved_dag = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    result = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    created_by_user_id = Column(PGUUID(as_uuid=True), nullable=True)
