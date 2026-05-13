import logging
from sqlalchemy import text
from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("⚙️ Adicionando coluna 'updated_at' à tabela 'webhook_events'...")
    with engine_sync.connect() as conn:
        try:
            conn.execute(text('ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()'))
            conn.commit()
            logger.info("✅ Coluna 'updated_at' adicionada com sucesso.")
        except Exception as e:
            logger.error(f"❌ Erro ao adicionar coluna: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrate()
