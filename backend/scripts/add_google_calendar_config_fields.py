import sys
import os
import logging
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("🚀 Iniciando migração para adicionar default_event_color e add_user_email em google_tokens...")

    with engine_sync.begin() as conn:
        db_type = conn.dialect.name
        try:
            if db_type == "sqlite":
                cursor = conn.execute(text("PRAGMA table_info(google_tokens)"))
                columns = [row[1] for row in cursor.fetchall()]
                
                if "default_event_color" not in columns:
                    conn.execute(text("ALTER TABLE google_tokens ADD COLUMN default_event_color VARCHAR"))
                    logger.info("✅ Coluna 'default_event_color' adicionada.")
                    
                if "add_user_email" not in columns:
                    conn.execute(text("ALTER TABLE google_tokens ADD COLUMN add_user_email BOOLEAN DEFAULT 0"))
                    logger.info("✅ Coluna 'add_user_email' adicionada.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS default_event_color VARCHAR"))
                logger.info("✅ Coluna 'default_event_color' garantida.")
                
                conn.execute(text("ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS add_user_email BOOLEAN DEFAULT FALSE"))
                logger.info("✅ Coluna 'add_user_email' garantida.")
                
        except Exception as err:
            logger.error(f"❌ Erro ao rodar alterações no banco: {err}")
            raise

    logger.info("🎉 Migração concluída com sucesso!")

if __name__ == "__main__":
    migrate()
