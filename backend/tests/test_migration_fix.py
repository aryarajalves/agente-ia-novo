import pytest
from sqlalchemy import text, inspect
from database import engine

@pytest.mark.asyncio
async def test_migration_structures_exist():
    """
    Verifica se as estruturas que causaram o erro de migração existem no banco.
    Isso confirma que o init_db as criou com sucesso.
    """
    async with engine.connect() as conn:
        def get_tables(connection):
            inspector = inspect(connection)
            return inspector.get_table_names()
            
        tables = await conn.run_sync(get_tables)
        
        # O erro DuplicateTable ocorreu porque estas tabelas já existiam
        # Então agora verificamos se elas estão lá
        assert "transcription_folders" in tables
        assert "transcription_tasks" in tables
        
        # Verifica se o link entre elas existe (folder_id)
        def get_columns(connection, table_name):
            inspector = inspect(connection)
            return [c['name'] for c in inspector.get_columns(table_name)]
            
        cols = await conn.run_sync(get_columns, "transcription_tasks")
        assert "folder_id" in cols

@pytest.mark.asyncio
async def test_alembic_version_table():
    """
    Verifica se a tabela alembic_version existe.
    """
    async with engine.connect() as conn:
        def get_tables(connection):
            inspector = inspect(connection)
            return inspector.get_table_names()
            
        tables = await conn.run_sync(get_tables)
        assert "alembic_version" in tables
