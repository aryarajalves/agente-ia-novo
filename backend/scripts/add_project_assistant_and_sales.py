import sys
import os
import logging
from sqlalchemy import text

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync, Base
import models  # Garante que os modelos sejam carregados

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("🚀 Iniciando migração para Assistente de Projeto e Vendas...")

    # 1. Adicionar colunas em webhook_configs
    migrations = [
        ("webhook_configs", "project_assistant_label", "VARCHAR"),
        ("webhook_configs", "project_assistant_keyword", "VARCHAR"),
        ("webhook_configs", "project_assistant_deactivate_keyword", "VARCHAR"),
        ("webhook_configs", "project_assistant_entry_message", "TEXT"),
        ("webhook_configs", "project_assistant_exit_message", "TEXT"),
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

    # 2. Criar a tabela sales se ela não existir
    with engine_sync.begin() as conn:
        logger.info("🛠️ Criando tabela sales (se não existir)...")
        Base.metadata.create_all(conn, tables=[
            models.SaleModel.__table__
        ])
        logger.info("✅ Tabela sales criada/verificada com sucesso.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro geral na migração: {e}")
        sys.exit(1)
