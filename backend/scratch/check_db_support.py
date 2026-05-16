import asyncio
import sys
import os

# Adiciona o diretório backend ao path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.connection import async_session
from sqlalchemy import select
from models import SupportRequestModel

async def check_support():
    async with async_session() as db:
        result = await db.execute(select(SupportRequestModel).order_by(SupportRequestModel.id.desc()).limit(10))
        requests = result.scalars().all()
        print(f"Encontrados {len(requests)} chamados de suporte.")
        for r in requests:
            print(f"ID: {r.id} | Session: {r.session_id} | Name: {r.user_name} | Reason: {r.reason} | Status: {r.status} | Created: {r.created_at}")

if __name__ == "__main__":
    asyncio.run(check_support())
