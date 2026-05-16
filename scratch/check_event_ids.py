import asyncio
from sqlalchemy import select, text
from database import async_session
from models import WebhookEventModel

async def check_event():
    async with async_session() as db:
        # Pegar os últimos 5 eventos
        res = await db.execute(select(WebhookEventModel).order_by(WebhookEventModel.id.desc()).limit(5))
        events = res.scalars().all()
        
        for ev in events:
            print(f"ID: {ev.id}")
            print(f"Status: {ev.status}")
            print(f"Conta ID: {ev.conta_id}")
            print(f"Conversa ID: {ev.conversa_id}")
            print(f"Steps: {ev.processing_steps}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_event())
