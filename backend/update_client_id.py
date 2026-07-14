import asyncio
from database import get_db
from sqlalchemy import text

async def run():
    async for db in get_db():
        print("Atualizando zapvoice_client_id para 12 na tabela webhook_configs...")
        await db.execute(text("UPDATE webhook_configs SET zapvoice_client_id = '12' WHERE id = 1"))
        await db.commit()
        print("Atualização concluída com sucesso!")

if __name__ == "__main__":
    asyncio.run(run())
