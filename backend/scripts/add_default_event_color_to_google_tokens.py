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
#   docker exec backend-agente-local python scripts/add_default_event_color_to_google_tokens.py
#
# Este script adiciona a coluna 'default_event_color' na tabela 'google_tokens' (se não existir).
# Ela guarda a cor padrão (nome PT/EN ou colorId "1"-"11", ver GCAL_COLOR_MAP em
# google_calendar.py) aplicada aos eventos criados pelo agente via google_calendar_manager quando
# a IA não especifica uma cor explícita na chamada. Configurável na tela de Integrações Globais.

def migrate():
    logger.info("🚀 Iniciando migração para adicionar 'default_event_color' na tabela google_tokens...")

    with engine_sync.begin() as conn:
        db_type = conn.dialect.name
        try:
            if db_type == "sqlite":
                cursor = conn.execute(text("PRAGMA table_info(google_tokens)"))
                columns = [row[1] for row in cursor.fetchall()]
                if "default_event_color" not in columns:
                    conn.execute(text("ALTER TABLE google_tokens ADD COLUMN default_event_color VARCHAR"))
                    logger.info("✅ Coluna 'default_event_color' adicionada à tabela 'google_tokens' (SQLite).")
                else:
                    logger.info("✨ Coluna 'default_event_color' já existe na tabela 'google_tokens'.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS default_event_color VARCHAR"))
                logger.info("✅ Coluna 'default_event_color' adicionada à tabela 'google_tokens' (PostgreSQL).")
        except Exception as col_err:
            logger.error(f"⚠️ Erro ao adicionar coluna 'default_event_color' na tabela google_tokens: {col_err}")
            raise

    logger.info("🎉 Migração de 'default_event_color' em google_tokens concluída!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
