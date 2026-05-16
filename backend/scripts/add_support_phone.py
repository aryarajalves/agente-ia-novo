import asyncio
from sqlalchemy import text
from database.connection import engine

async def migrate():
    async with engine.begin() as conn:
        print("🔍 Verificando se a coluna 'contact_phone' existe em 'support_requests'...")
        # Check if column exists
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='support_requests' AND column_name='contact_phone';"))
        exists = res.fetchone()
        
        if not exists:
            print("🚀 Adicionando coluna 'contact_phone' à tabela 'support_requests'...")
            await conn.execute(text("ALTER TABLE support_requests ADD COLUMN contact_phone VARCHAR;"))
            print("✅ Coluna adicionada com sucesso.")
        else:
            print("✅ Coluna 'contact_phone' já existe.")

if __name__ == "__main__":
    asyncio.run(migrate())
