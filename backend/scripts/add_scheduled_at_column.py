import asyncio
import os
import sys

# Adiciona o diretório backend ao path
sys.path.append(os.getcwd() + "/backend")

from database import SessionLocal, engine
from sqlalchemy import text

async def run_migration():
    print("Iniciando migracao: Adicionando coluna 'scheduled_at' em 'webhook_events'...")
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        from database import async_session
        
        async with async_session() as db:
            await db.execute(text("ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP"))
            await db.commit()
            print("Coluna 'scheduled_at' adicionada com sucesso.")
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
