import logging
from sqlalchemy import text
from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    table = "scheduled_triggers"
    column = "zapjords_label"
    col_type = "TEXT"

    with engine_sync.connect() as conn:
        logger.info(f"Verificando coluna {column} na tabela {table}...")
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            conn.commit()
            logger.info(f"✅ Coluna {column} adicionada à tabela {table}.")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                logger.info(f"✨ Coluna {column} já existe na tabela {table}.")
            else:
                logger.error(f"❌ Erro ao adicionar coluna {column}: {e}")

        # Migrar dados se a coluna antiga zapjords_label existir
        try:
            logger.info("Copiando dados de zapjords_label para zapjords_label...")
            conn.execute(text(f"UPDATE {table} SET {column} = zapjords_label WHERE {column} IS NULL"))
            conn.commit()
            logger.info("✅ Dados de zapjords_label migrados com sucesso para zapjords_label.")
        except Exception as e:
            logger.info(f"ℹ️ Não foi possível copiar dados antigos ou zapjords_label não existe: {e}")

if __name__ == "__main__":
    migrate()
