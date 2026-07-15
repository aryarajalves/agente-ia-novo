import sys
import os
import logging

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync, Base
import models  # Garante que os modelos sejam carregados

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("🚀 Iniciando migração para tabela de eventos do calendário...")
    
    with engine_sync.begin() as conn:
        logger.info("🛠️ Criando tabela calendar_events (se não existir)...")
        Base.metadata.create_all(conn, tables=[
            models.CalendarEventModel.__table__
        ])
        
        logger.info("✅ Tabela calendar_events criada com sucesso.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
