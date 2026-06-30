import asyncio
import os
import sys

# Adiciona o diretório backend ao path
sys.path.append(os.getcwd())
sys.path.append(os.getcwd() + "/backend")

from sqlalchemy import text

async def run_migration():
    print("Iniciando migracao: Adicionando coluna 'cached_tokens' em 'interaction_logs'...")
    try:
        from database import async_session
        
        async with async_session() as db:
            try:
                await db.execute(text("ALTER TABLE interaction_logs ADD COLUMN cached_tokens INTEGER DEFAULT 0"))
                await db.commit()
                print("Coluna 'cached_tokens' adicionada com sucesso.")
            except Exception as inner_e:
                print(f"Tentativa direta falhou, tentando com IF NOT EXISTS: {inner_e}")
                await db.execute(text("ALTER TABLE interaction_logs ADD COLUMN IF NOT EXISTS cached_tokens INTEGER DEFAULT 0"))
                await db.commit()
                print("Coluna 'cached_tokens' adicionada ou já existente via IF NOT EXISTS.")
    except Exception as e:
        print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
