"""encryption key versioning

Revision ID: 9c1d2e3f4a71
Revises: 8b2c3d4e5f61
Create Date: 2026-05-07

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c1d2e3f4a71"
down_revision: Union[str, Sequence[str], None] = "8b2c3d4e5f61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "employee_bank_accounts",
        sa.Column("key_version", sa.String(length=10), server_default=sa.text("'1'"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("employee_bank_accounts", "key_version")

