import logging
from sqlalchemy import text
from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    # Colunas a adicionar
    migrations = [
        ("webhook_configs", "blocked_contacts", "TEXT"),
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
