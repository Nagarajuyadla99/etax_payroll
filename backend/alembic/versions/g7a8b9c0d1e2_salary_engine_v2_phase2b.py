"""salary engine v2 phase 2b additive schema

Revision ID: g7a8b9c0d1e2
Revises: 12d3e4f5a6b7
Create Date: 2026-05-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "g7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "12d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("salary_components", sa.Column("component_category", sa.String(length=30), nullable=True))
    op.add_column("salary_components", sa.Column("calculation_type", sa.String(length=20), nullable=True))
    op.add_column("salary_components", sa.Column("formula_expression", sa.Text(), nullable=True))
    op.add_column("salary_components", sa.Column("system_code", sa.String(length=30), nullable=True))
    op.add_column(
        "salary_components",
        sa.Column(
            "rounding_rule",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "salary_components",
        sa.Column(
            "meta",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )

    op.create_table(
        "salary_component_groups",
        sa.Column("group_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["organisation_id"],
            ["organisations.organisation_id"],
            name=op.f("salary_component_groups_organisation_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("group_id", name=op.f("salary_component_groups_pkey")),
        sa.UniqueConstraint("organisation_id", "code", name="ux_salary_component_groups_org_code"),
    )

    op.create_table(
        "salary_component_group_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("component_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sequence", sa.SmallInteger(), server_default=sa.text("1"), nullable=False),
        sa.ForeignKeyConstraint(
            ["component_id"],
            ["salary_components.component_id"],
            name=op.f("salary_component_group_items_component_id_fkey"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["salary_component_groups.group_id"],
            name=op.f("salary_component_group_items_group_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("salary_component_group_items_pkey")),
        sa.UniqueConstraint("group_id", "component_id", name="ux_salary_component_group_items_group_component"),
    )

    op.create_table(
        "salary_derived_variables",
        sa.Column("variable_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("expression", sa.Text(), nullable=False),
        sa.Column("data_type", sa.String(length=10), server_default=sa.text("'number'"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["organisation_id"],
            ["organisations.organisation_id"],
            name=op.f("salary_derived_variables_organisation_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("variable_id", name=op.f("salary_derived_variables_pkey")),
        sa.UniqueConstraint("organisation_id", "code", name="ux_salary_derived_variables_org_code"),
    )

    op.create_table(
        "org_statutory_configs",
        sa.Column("config_id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organisation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("statutory_code", sa.String(length=20), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "effective_to IS NULL OR effective_to >= effective_from",
            name="ck_org_statutory_configs_effective_range",
        ),
        sa.ForeignKeyConstraint(
            ["organisation_id"],
            ["organisations.organisation_id"],
            name=op.f("org_statutory_configs_organisation_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("config_id", name=op.f("org_statutory_configs_pkey")),
        sa.UniqueConstraint(
            "organisation_id",
            "statutory_code",
            "effective_from",
            name="ux_org_statutory_configs_org_code_from",
        ),
    )

    op.create_table(
        "salary_template_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sequence", sa.SmallInteger(), server_default=sa.text("1"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["group_id"],
            ["salary_component_groups.group_id"],
            name=op.f("salary_template_groups_group_id_fkey"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["salary_templates.template_id"],
            name=op.f("salary_template_groups_template_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("salary_template_groups_pkey")),
        sa.UniqueConstraint("template_id", "group_id", name="ux_salary_template_groups_template_group"),
    )


def downgrade() -> None:
    op.drop_table("salary_template_groups")
    op.drop_table("org_statutory_configs")
    op.drop_table("salary_derived_variables")
    op.drop_table("salary_component_group_items")
    op.drop_table("salary_component_groups")
    op.drop_column("salary_components", "meta")
    op.drop_column("salary_components", "rounding_rule")
    op.drop_column("salary_components", "system_code")
    op.drop_column("salary_components", "formula_expression")
    op.drop_column("salary_components", "calculation_type")
    op.drop_column("salary_components", "component_category")
