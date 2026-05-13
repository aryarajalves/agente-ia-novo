import os
import sys
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

# Adiciona o diretório backend ao path para importar database
sys.path.append(os.path.join(os.getcwd(), 'backend'))

async def migrate():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL não configurada.")
        return

    # Converte URL sync para async se necessário
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

    engine = create_async_engine(database_url)

    async with engine.begin() as conn:
        print("Adicionando colunas de etiquetas à tabela tools...")
        try:
            await conn.execute(text("ALTER TABLE tools ADD COLUMN IF NOT EXISTS labels_to_add TEXT"))
            await conn.execute(text("ALTER TABLE tools ADD COLUMN IF NOT EXISTS labels_to_remove TEXT"))
            print("Migração concluída com sucesso!")
        except Exception as e:
            print(f"Erro na migração: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
