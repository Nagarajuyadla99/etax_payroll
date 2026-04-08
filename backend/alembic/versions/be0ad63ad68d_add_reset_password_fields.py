"""add reset password fields

Revision ID: be0ad63ad68d
Revises: ede906d3a47b
Create Date: 2026-03-15 11:02:53.670119
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = 'be0ad63ad68d'
down_revision: Union[str, Sequence[str], None] = 'ede906d3a47b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ✅ CLEANED — NO DROPS, NO DANGEROUS OPERATIONS
    pass


def downgrade() -> None:
    # ✅ CLEANED — NO REVERSE OPERATIONS
    pass