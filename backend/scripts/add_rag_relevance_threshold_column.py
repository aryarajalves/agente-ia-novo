import logging
from sqlalchemy import text
from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    # Coluna a adicionar à tabela agent_config
    migrations = [
        ("agent_config", "rag_relevance_threshold", "FLOAT DEFAULT 0.0"),
    ]

    with engine_sync.connect() as conn:
        for table, column, col_type in migrations:
            logger.info(f"Verificando coluna {column} na tabela {table}...")
            try:
                # Tenta adicionar a coluna
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                conn.commit()
                logger.info(f"✅ Coluna {column} adicionada à tabela {table}.")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    logger.info(f"✨ Coluna {column} já existe na tabela {table}.")
                else:
                    logger.error(f"❌ Erro ao adicionar coluna {column}: {e}")

if __name__ == "__main__":
    migrate()
