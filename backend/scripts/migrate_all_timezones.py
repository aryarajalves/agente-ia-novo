import asyncio
import logging
from sqlalchemy import text, inspect
from database.connection import engine_sync
from sqlalchemy.schema import CreateTable

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_to_timestamptz():
    """
    Percorre todas as tabelas e converte colunas TIMESTAMP para TIMESTAMPTZ.
    """
    inspector = inspect(engine_sync)
    tables = inspector.get_table_names()
    
    logger.info(f"🔍 Iniciando migração de fuso horário para {len(tables)} tabelas...")
    
    with engine_sync.connect() as conn:
        for table_name in tables:
            columns = inspector.get_columns(table_name)
            for column in columns:
                # Se o tipo for TIMESTAMP (sem timezone)
                col_type = str(column['type']).upper()
                if "TIMESTAMP" in col_type and "WITH TIME ZONE" not in col_type:
                    logger.info(f"⚙️ Convertendo {table_name}.{column['name']} ({col_type}) para TIMESTAMPTZ...")
                    
                    # SQL para alterar o tipo da coluna no PostgreSQL
                    # USING permite converter os dados existentes
                    sql = f'ALTER TABLE {table_name} ALTER COLUMN "{column["name"]}" TYPE TIMESTAMPTZ USING "{column["name"]}" AT TIME ZONE \'UTC\''
                    
                    try:
                        conn.execute(text(sql))
                        conn.commit()
                        logger.info(f"✅ {table_name}.{column['name']} convertida com sucesso.")
                    except Exception as e:
                        logger.error(f"❌ Erro ao converter {table_name}.{column['name']}: {e}")
                        conn.rollback()

    logger.info("✨ Migração concluída!")

if __name__ == "__main__":
    migrate_to_timestamptz()
