"""add_followup_business_hours

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-04-19 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if column exists before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('webhook_configs')]

    if 'followup_business_hours' not in columns:
        op.add_column('webhook_configs', sa.Column('followup_business_hours', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('webhook_configs', 'followup_business_hours')
