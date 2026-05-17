import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@banco-agente-local:5432/ai_agent_db")
    print("Connecting to:", db_url)
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public'"))
        print("Tables:", [row[0] for row in r.fetchall()])
        
        try:
            r2 = await conn.execute(text("SELECT COUNT(*) FROM webhook_leads_1"))
            print("count webhook_leads_1:", r2.scalar())
        except Exception as e:
            print("No webhook_leads_1:", e)

if __name__ == "__main__":
    asyncio.run(main())
