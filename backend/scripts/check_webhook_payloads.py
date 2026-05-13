import asyncio
from sqlalchemy import text
from database import engine

async def check_payloads():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT id, raw_payload, conta_id FROM webhook_events ORDER BY created_at DESC LIMIT 5"))
        rows = result.fetchall()
        for row in rows:
            print(f"ID: {row[0]}")
            print(f"Conta ID: {row[2]}")
            print(f"Payload: {row[1][:500]}...")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(check_payloads())
