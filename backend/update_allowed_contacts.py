import asyncio
from database import get_db
from sqlalchemy import text

async def run():
    async for db in get_db():
        print("Atualizando allowed_contacts e blocked_contacts...")
        await db.execute(text("UPDATE webhook_configs SET allowed_contacts = '[\"5585996123586\"]', blocked_contacts = '[]' WHERE id = 1"))
        await db.commit()
        print("Atualização concluída com sucesso!")

if __name__ == "__main__":
    asyncio.run(run())
