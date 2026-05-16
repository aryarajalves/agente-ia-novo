import sys
import os
import logging

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.connection import engine_sync, Base
import models  # Garante que os modelos sejam carregados

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("🚀 Iniciando migração para tabelas de triggers...")
    
    with engine_sync.begin() as conn:
        # 1. Criar tabelas usando SQLAlchemy (Base.metadata)
        # O SQLAlchemy não criará se já existirem
        logger.info("🛠️ Criando tabelas scheduled_triggers e message_status (se não existirem)...")
        Base.metadata.create_all(conn, tables=[
            models.ScheduledTrigger.__table__,
            models.MessageStatus.__table__
        ])
        
        logger.info("✅ Tabelas criadas com sucesso.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
