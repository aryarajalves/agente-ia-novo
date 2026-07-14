import sys
import os
import logging

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine_sync, Base
import models  # Garante que os novos modelos sejam importados e registrados no metadata

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    logger.info("🚀 Iniciando migração para tabelas de depoimentos...")
    
    with engine_sync.begin() as conn:
        logger.info("🛠️ Criando tabelas (se não existirem)...")
        Base.metadata.create_all(conn, tables=[
            models.TestimonialModel.__table__,
            models.SentTestimonialModel.__table__
        ])
        
        logger.info("✅ Tabelas de depoimentos (testimonials e sent_testimonials) criadas com sucesso.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"❌ Erro na migração: {e}")
        sys.exit(1)
