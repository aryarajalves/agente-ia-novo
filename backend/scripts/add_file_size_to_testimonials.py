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
#   docker exec backend-agente-local python scripts/add_file_size_to_testimonials.py
#
# Este script:
#   1. Adiciona a coluna 'file_size_bytes' na tabela 'testimonials' (se não existir).
#   2. Faz o backfill do tamanho de cada depoimento já cadastrado, consultando o
#      tamanho real do arquivo no S3/MinIO (HEAD object) para quem ainda estiver
#      com file_size_bytes vazio (registros criados antes desta migração).

def migrate():
    logger.info("🚀 Iniciando migração para adicionar 'file_size_bytes' na tabela testimonials...")

    with engine_sync.begin() as conn:
        db_type = conn.dialect.name
        try:
            if db_type == "sqlite":
                cursor = conn.execute(text("PRAGMA table_info(testimonials)"))
                columns = [row[1] for row in cursor.fetchall()]
                if "file_size_bytes" not in columns:
                    conn.execute(text("ALTER TABLE testimonials ADD COLUMN file_size_bytes INTEGER"))
                    logger.info("✅ Coluna 'file_size_bytes' adicionada à tabela 'testimonials' (SQLite).")
                else:
                    logger.info("✨ Coluna 'file_size_bytes' já existe na tabela 'testimonials'.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER"))
                logger.info("✅ Coluna 'file_size_bytes' adicionada à tabela 'testimonials' (PostgreSQL).")
        except Exception as col_err:
            logger.error(f"⚠️ Erro ao adicionar coluna 'file_size_bytes' na tabela testimonials: {col_err}")
            raise

    logger.info("🔎 Buscando depoimentos sem 'file_size_bytes' para backfill via S3/MinIO...")
    try:
        from s3_service import s3_service

        with engine_sync.begin() as conn:
            rows = conn.execute(
                text("SELECT id, s3_key FROM testimonials WHERE file_size_bytes IS NULL")
            ).fetchall()

            logger.info(f"📦 {len(rows)} depoimento(s) sem tamanho registrado. Consultando S3/MinIO...")
            updated = 0
            failed = 0
            for row in rows:
                testimonial_id, s3_key = row[0], row[1]
                try:
                    head = s3_service.s3_client.head_object(Bucket=s3_service.bucket_name, Key=s3_key)
                    size_bytes = head.get("ContentLength")
                    if size_bytes is not None:
                        conn.execute(
                            text("UPDATE testimonials SET file_size_bytes = :size WHERE id = :id"),
                            {"size": size_bytes, "id": testimonial_id}
                        )
                        updated += 1
                except Exception as head_err:
                    failed += 1
                    logger.warning(f"⚠️ Não foi possível obter o tamanho de '{s3_key}' (id={testimonial_id}): {head_err}")

            logger.info(f"✅ Backfill concluído: {updated} atualizado(s), {failed} falha(s) (arquivo pode não existir mais no storage).")
    except Exception as backfill_err:
        logger.error(f"⚠️ Erro geral no backfill de tamanhos: {backfill_err}")

    logger.info("🎉 Migração de 'file_size_bytes' em testimonials concluída!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
