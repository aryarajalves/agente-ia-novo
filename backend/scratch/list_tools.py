
import asyncio
import os
from dotenv import load_dotenv

# Carrega o .env da raiz do projeto
load_dotenv("c:/Users/aryar/.gemini/antigravity/scratch/Projetos Serios/Cria Agente de IA Para Automacao/.env")

if not os.getenv("DATABASE_URL"):
    # Fallback para execução local fora do Docker
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_agent_db"

from sqlalchemy import select
from database.connection import async_session
from models import ToolModel

async def list_tools():
    async with async_session() as db:
        res = await db.execute(select(ToolModel))
        tools = res.scalars().all()
        for t in tools:
            print(f"Tool: {t.name}")
            print(f"Schema: {t.parameters_schema}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(list_tools())
