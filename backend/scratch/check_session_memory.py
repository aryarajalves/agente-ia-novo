import asyncio
import json
from sqlalchemy import select
from database.connection import engine
from models import UserMemoryModel, SupportRequestModel

async def check_session_state(session_id):
    async with engine.connect() as conn:
        print(f"🔍 Verificando Memória para sessão: {session_id}")
        res = await conn.execute(select(UserMemoryModel).where(UserMemoryModel.session_id == session_id))
        memories = res.fetchall()
        for m in memories:
            print(f"  - {m.key}: {m.value}")
        
        print(f"\n🔍 Verificando Chamados de Suporte para sessão: {session_id}")
        res = await conn.execute(select(SupportRequestModel).where(SupportRequestModel.session_id == session_id).order_by(SupportRequestModel.id.desc()))
        tickets = res.fetchall()
        for t in tickets:
            print(f"  - ID {t.id} | Status: {t.status} | Motivo: {t.reason}")

if __name__ == "__main__":
    import sys
    sid = "6" # Assumindo sessão 6 baseada no histórico anterior, mas vou checar os logs para confirmar
    asyncio.run(check_session_state(sid))
