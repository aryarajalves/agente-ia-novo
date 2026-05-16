import asyncio
import logging
import sys
import os

# Adicionar o caminho do backend para poder importar os módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import async_session
from webhooks.service import delete_contact_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_delete():
    async with async_session() as db:
        try:
            webhook_id = 1
            table_name = "leads"
            phones = ["558596123586"]
            lead_ids = [5]
            
            logger.info(f"Tentando deletar lead {lead_ids} e telefones {phones}...")
            await delete_contact_data(db, webhook_id, table_name, phones, lead_ids)
            await db.commit()
            logger.info("✅ Deleção concluída com sucesso no script de teste.")
        except Exception as e:
            logger.error(f"❌ Erro durante a deleção: {e}", exc_info=True)
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(test_delete())
