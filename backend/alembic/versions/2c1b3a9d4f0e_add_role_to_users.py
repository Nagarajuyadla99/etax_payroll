"""add role to users

Revision ID: 2c1b3a9d4f0e
Revises: 798bf5d2b8e6
Create Date: 2026-04-09
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2c1b3a9d4f0e"
down_revision = "798bf5d2b8e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'admin'"),
        ),
    )
    # Backfill safety: ensure existing rows get a value even if default isn't applied by DB.
    op.execute("UPDATE users SET role = 'admin' WHERE role IS NULL")
    op.alter_column("users", "role", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "role")

