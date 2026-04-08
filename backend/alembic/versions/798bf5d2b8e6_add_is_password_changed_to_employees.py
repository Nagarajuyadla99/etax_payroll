"""add is_password_changed to employees

Revision ID: 798bf5d2b8e6
Revises: 7b46068f9d08
Create Date: 2026-04-07 19:17:08.812319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '798bf5d2b8e6'
down_revision: Union[str, Sequence[str], None] = '7b46068f9d08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.add_column(
        'employees',
        sa.Column('is_password_changed', sa.Boolean(), server_default='false')
    )

def downgrade():
    op.drop_column('employees', 'is_password_changed')
