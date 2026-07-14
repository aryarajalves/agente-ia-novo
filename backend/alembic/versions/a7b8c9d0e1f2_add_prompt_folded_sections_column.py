"""add_prompt_folded_sections_column

Revision ID: a7b8c9d0e1f2
Revises: f4a5b6c7d8e9
Create Date: 2026-07-04 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f4a5b6c7d8e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if column exists before adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('agent_config')]

    if 'prompt_folded_sections' not in columns:
        # Nullable e sem DEFAULT no banco: quando vazio, o backend/frontend tratam como
        # "nenhuma seção recolhida" (dict vazio), então nenhum backfill é necessário —
        # agentes existentes simplesmente abrem com todas as seções expandidas.
        op.add_column('agent_config', sa.Column('prompt_folded_sections', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('agent_config', 'prompt_folded_sections')
