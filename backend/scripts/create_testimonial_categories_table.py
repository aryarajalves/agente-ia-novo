import sys
import os
import logging
from sqlalchemy import text

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync, Base
import models  # Garante que os novos modelos sejam importados e registrados no metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("🚀 Iniciando migração para tabelas de categorias de depoimentos...")
    
    with engine_sync.begin() as conn:
        # 1. Criar a nova tabela se não existir
        logger.info("🛠️ Criando tabela 'testimonial_categories' (se não existir)...")
        Base.metadata.create_all(conn, tables=[
            models.TestimonialCategoryModel.__table__
        ])
        
        # 2. Adicionar a coluna testimonial_category na tabela agent_config se não existir
        logger.info("🛠️ Verificando/adicionando coluna 'testimonial_category' na tabela 'agent_config'...")
        # Verifica se a coluna já existe (suporta SQLite e PostgreSQL)
        db_type = conn.dialect.name
        try:
            if db_type == "sqlite":
                # SQLite não suporta IF NOT EXISTS no alter, então vamos verificar a existência do campo
                cursor = conn.execute(text("PRAGMA table_info(agent_config)"))
                columns = [row[1] for row in cursor.fetchall()]
                if "testimonial_category" not in columns:
                    conn.execute(text("ALTER TABLE agent_config ADD COLUMN testimonial_category VARCHAR"))
                    logger.info("✅ Coluna 'testimonial_category' adicionada à tabela 'agent_config' (SQLite).")
                else:
                    logger.info("✨ Coluna 'testimonial_category' já existe na tabela 'agent_config'.")
            else:
                # PostgreSQL
                conn.execute(text("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS testimonial_category VARCHAR"))
                logger.info("✅ Coluna 'testimonial_category' adicionada à tabela 'agent_config' (PostgreSQL).")
        except Exception as col_err:
            logger.error(f"⚠️ Erro ao adicionar coluna na tabela agent_config: {col_err}")

        # 3. Popular categorias padrão se a tabela estiver vazia
        try:
            cursor = conn.execute(text("SELECT COUNT(*) FROM testimonial_categories"))
            count = cursor.fetchone()[0]
            if count == 0:
                logger.info("🌱 Semeando categorias padrão de depoimentos...")
                default_categories = [
                    {"name": "Método Laser Day", "value": "metodo_laser_day"},
                    {"name": "Curso B", "value": "curso_b"},
                    {"name": "Aluguel de Máquinas", "value": "aluguel_maquinas"}
                ]
                for cat in default_categories:
                    conn.execute(
                        text("INSERT INTO testimonial_categories (name, value, created_at) VALUES (:name, :value, CURRENT_TIMESTAMP)"),
                        cat
                    )
                logger.info("✅ Semeadores padrão executados com sucesso.")
            else:
                logger.info("✨ Tabela 'testimonial_categories' já possui registros. Pulando semeação.")
        except Exception as seed_err:
            logger.error(f"⚠️ Erro ao semear categorias: {seed_err}")

    logger.info("🎉 Migração concluída com sucesso!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
