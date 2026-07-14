"""add_prompt_type_to_drafts

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-07-02 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f4a5b6c7d8e9'
down_revision: Union[str, Sequence[str], None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('prompt_drafts')]

    if 'prompt_type' not in columns:
        op.add_column('prompt_drafts', sa.Column('prompt_type', sa.String(), nullable=True, server_default='static'))


def downgrade() -> None:
    op.drop_column('prompt_drafts', 'prompt_type')
