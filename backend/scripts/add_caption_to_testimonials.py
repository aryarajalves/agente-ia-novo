import sys
import os
import logging
from sqlalchemy import text

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Uso (dentro do container do backend):
#   docker exec backend-agente-local python scripts/add_caption_to_testimonials.py

def migrate():
    logger.info("🚀 Iniciando migração para adicionar 'caption' na tabela testimonials...")

    with engine_sync.begin() as conn:
        db_type = conn.dialect.name
        try:
            if db_type == "sqlite":
                cursor = conn.execute(text("PRAGMA table_info(testimonials)"))
                columns = [row[1] for row in cursor.fetchall()]
                if "caption" not in columns:
                    conn.execute(text("ALTER TABLE testimonials ADD COLUMN caption TEXT"))
                    logger.info("✅ Coluna 'caption' adicionada à tabela 'testimonials' (SQLite).")
                else:
                    logger.info("✨ Coluna 'caption' já existe na tabela 'testimonials'.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS caption TEXT"))
                logger.info("✅ Coluna 'caption' adicionada à tabela 'testimonials' (PostgreSQL).")
        except Exception as col_err:
            logger.error(f"⚠️ Erro ao adicionar coluna 'caption' na tabela testimonials: {col_err}")

    logger.info("🎉 Migração de 'caption' em testimonials concluída!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
