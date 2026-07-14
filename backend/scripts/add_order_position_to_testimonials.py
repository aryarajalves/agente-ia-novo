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
#   docker exec backend-agente-local python scripts/add_order_position_to_testimonials.py
#
# Este script:
#   1. Adiciona a coluna 'order_position' na tabela 'testimonials' (se não existir).
#   2. Faz o backfill: para cada categoria, numera os depoimentos existentes em ordem
#      sequencial (1, 2, 3...) respeitando a ordem de criação atual (created_at), para
#      que a lista já comece com uma ordem previsível em vez de tudo NULL.

def migrate():
    logger.info("🚀 Iniciando migração para adicionar 'order_position' na tabela testimonials...")

    with engine_sync.begin() as conn:
        db_type = conn.dialect.name
        try:
            if db_type == "sqlite":
                cursor = conn.execute(text("PRAGMA table_info(testimonials)"))
                columns = [row[1] for row in cursor.fetchall()]
                if "order_position" not in columns:
                    conn.execute(text("ALTER TABLE testimonials ADD COLUMN order_position INTEGER"))
                    logger.info("✅ Coluna 'order_position' adicionada à tabela 'testimonials' (SQLite).")
                else:
                    logger.info("✨ Coluna 'order_position' já existe na tabela 'testimonials'.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS order_position INTEGER"))
                logger.info("✅ Coluna 'order_position' adicionada à tabela 'testimonials' (PostgreSQL).")
        except Exception as col_err:
            logger.error(f"⚠️ Erro ao adicionar coluna 'order_position' na tabela testimonials: {col_err}")
            raise

    logger.info("🔎 Numerando depoimentos sem 'order_position' por categoria (ordem de criação atual)...")
    try:
        with engine_sync.begin() as conn:
            categories = [
                row[0] for row in conn.execute(
                    text("SELECT DISTINCT category FROM testimonials WHERE order_position IS NULL")
                ).fetchall()
            ]

            total_updated = 0
            for category in categories:
                rows = conn.execute(
                    text("SELECT id FROM testimonials WHERE category = :cat ORDER BY created_at ASC"),
                    {"cat": category}
                ).fetchall()
                for idx, row in enumerate(rows, start=1):
                    conn.execute(
                        text("UPDATE testimonials SET order_position = :pos WHERE id = :id"),
                        {"pos": idx, "id": row[0]}
                    )
                    total_updated += 1
                logger.info(f"✅ Categoria '{category}': {len(rows)} depoimento(s) numerado(s) de 1 a {len(rows)}.")

            logger.info(f"🎉 Backfill concluído: {total_updated} depoimento(s) numerado(s) no total.")
    except Exception as backfill_err:
        logger.error(f"⚠️ Erro geral no backfill de 'order_position': {backfill_err}")

    logger.info("🎉 Migração de 'order_position' em testimonials concluída!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
