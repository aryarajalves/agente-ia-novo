import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@banco-agente-local:5432/ai_agent_db")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT id, name, model, router_enabled, router_simple_model, router_complex_model, fallback_model FROM agent_config WHERE id=1"))
        row = r.fetchone()
        if row:
            print(f"ID: {row[0]}, Name: {row[1]}\nModel: {row[2]}, Router: {row[3]}\nSimple Model: {row[4]}\nComplex Model: {row[5]}\nFallback Model: {row[6]}")
        else:
            print("Agent not found!")

if __name__ == "__main__":
    asyncio.run(main())
