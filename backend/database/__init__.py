import os
import logging
from .connection import engine, engine_sync, async_session, AsyncSession, SessionLocal, Base, get_db, DATABASE_URL
from .sync import create_database_if_not_exists, sync_database_schema
from .seeds import seed_native_tools

logger = logging.getLogger(__name__)

async def init_db():
    """
    Inicializa o banco de dados de forma resiliente.
    Esta função substitui a lógica manual gigante do database.py antigo.
    """
    if os.getenv("TESTING") == "true":
        logger.info("🧪 Modo de teste detectado. Pulando init_db.")
        return

    # 1. Garantir que o banco físico exista (CREATE DATABASE)
    await create_database_if_not_exists(DATABASE_URL)

    # 2. Sincronizar Schema (Self-Healing Migrations)
    await sync_database_schema()

    # 3. Rodar Seeds (Dados iniciais)
    await seed_native_tools()

    logger.info("✅ Inicialização do banco de dados concluída com sucesso!")
