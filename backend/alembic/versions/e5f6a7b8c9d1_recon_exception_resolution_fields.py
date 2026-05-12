"""recon exception resolution fields

Revision ID: e5f6a7b8c9d1
Revises: d4e5f6a7b8c0
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e5f6a7b8c9d1"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reconciliation_exceptions", sa.Column("resolution_note", sa.Text(), nullable=True))
    op.add_column("reconciliation_exceptions", sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        op.f("reconciliation_exceptions_resolved_by_fkey"),
        "reconciliation_exceptions",
        "users",
        ["resolved_by"],
        ["user_id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(op.f("reconciliation_exceptions_resolved_by_fkey"), "reconciliation_exceptions", type_="foreignkey")
    op.drop_column("reconciliation_exceptions", "resolved_by")
    op.drop_column("reconciliation_exceptions", "resolution_note")

