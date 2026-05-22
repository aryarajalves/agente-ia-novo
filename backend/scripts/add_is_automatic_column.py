import asyncio
import os
import sys

# Adiciona o diretório backend ao path
sys.path.append(os.getcwd() + "/backend")
sys.path.append(os.getcwd())

from database import SessionLocal, engine
from sqlalchemy import text

async def run_migration():
    print("Iniciando migração: Adicionando coluna 'is_automatic' em 'webhook_events'...")
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        from database import async_session
        
        async with async_session() as db:
            await db.execute(text("ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT FALSE"))
            await db.commit()
            print("Coluna 'is_automatic' adicionada com sucesso no PostgreSQL/SQLite.")
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
