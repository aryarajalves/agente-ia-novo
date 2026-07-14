"""add_pre_router_prompt_column

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-07-02 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, Sequence[str], None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if column exists before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('agent_config')]

    if 'pre_router_prompt' not in columns:
        # Nullable e sem DEFAULT no banco: quando vazio, o backend usa em runtime o
        # template padrão (DEFAULT_PRE_ROUTER_PROMPT_TEMPLATE), então nenhum backfill
        # é necessário — agentes existentes já "enxergam" o prompt padrão via fallback.
        op.add_column('agent_config', sa.Column('pre_router_prompt', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('agent_config', 'pre_router_prompt')
