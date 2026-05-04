"""placeholder for missing DB revision

Revision ID: 84893e373797
Revises: 2c1b3a9d4f0e
Create Date: 2026-04-23

This revision exists to reconcile databases that were stamped with a revision
id not present in this repository history. It is a NO-OP migration.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "84893e373797"
down_revision: Union[str, Sequence[str], None] = "2c1b3a9d4f0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # no-op
    pass


def downgrade() -> None:
    # no-op
    pass

