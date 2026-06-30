import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@banco-agente-local:5432/ai_agent_db")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT id, name, system_prompt, dynamic_prompt, model FROM agent_config WHERE id=1"))
        row = r.fetchone()
        if row:
            print(f"Agent ID: {row[0]}\nName: {row[1]}\nModel: {row[4]}\nStatic Prompt Length: {len(row[2]) if row[2] else 0}\nDynamic Prompt: {row[3]}")
        else:
            print("Agent 1 not found!")

if __name__ == "__main__":
    asyncio.run(main())
