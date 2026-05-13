"""add_window_close_label

Revision ID: b9c1d2e3f4a5
Revises: 047a924d0aca
Create Date: 2026-04-19 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b9c1d2e3f4a5'
down_revision: Union[str, Sequence[str], None] = '047a924d0aca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if column exists before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('webhook_configs')]
    
    if 'window_close_label' not in columns:
        op.add_column('webhook_configs', sa.Column('window_close_label', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('webhook_configs', 'window_close_label')
