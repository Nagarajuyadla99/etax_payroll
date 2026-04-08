"""add password_hash to employees

Revision ID: 7b46068f9d08
Revises: be0ad63ad68d
Create Date: 2026-04-07 16:04:10.891872

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b46068f9d08'
down_revision: Union[str, Sequence[str], None] = 'be0ad63ad68d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        'employees',
        sa.Column('password_hash', sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column('employees', 'password_hash')