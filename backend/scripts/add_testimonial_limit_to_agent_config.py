import sys
import os
import logging
from sqlalchemy import text

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("🚀 Iniciando migração para adicionar testimonial_limit na tabela agent_config...")
    
    with engine_sync.begin() as conn:
        db_type = conn.dialect.name
        try:
            if db_type == "sqlite":
                cursor = conn.execute(text("PRAGMA table_info(agent_config)"))
                columns = [row[1] for row in cursor.fetchall()]
                if "testimonial_limit" not in columns:
                    conn.execute(text("ALTER TABLE agent_config ADD COLUMN testimonial_limit INTEGER DEFAULT 1"))
                    logger.info("✅ Coluna 'testimonial_limit' adicionada à tabela 'agent_config' (SQLite).")
                else:
                    logger.info("✨ Coluna 'testimonial_limit' já existe na tabela 'agent_config'.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS testimonial_limit INTEGER DEFAULT 1"))
                logger.info("✅ Coluna 'testimonial_limit' adicionada à tabela 'agent_config' (PostgreSQL).")
        except Exception as col_err:
            logger.error(f"⚠️ Erro ao adicionar coluna na tabela agent_config: {col_err}")

    logger.info("🎉 Migração de testimonial_limit concluída!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
