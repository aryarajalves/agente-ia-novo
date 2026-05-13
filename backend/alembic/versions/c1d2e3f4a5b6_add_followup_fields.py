"""add_followup_fields

Revision ID: c1d2e3f4a5b6
Revises: b9c1d2e3f4a5
Create Date: 2026-04-19 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b9c1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if column exists before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('webhook_configs')]

    if 'followup_enabled' not in columns:
        op.add_column('webhook_configs', sa.Column('followup_enabled', sa.Boolean(), nullable=True, server_default='false'))
    
    if 'followup_steps' not in columns:
        op.add_column('webhook_configs', sa.Column('followup_steps', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('webhook_configs', 'followup_steps')
    op.drop_column('webhook_configs', 'followup_enabled')
