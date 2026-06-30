import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@banco-agente-local:5432/ai_agent_db")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        # Update agent_config table to disable router or set valid models
        await conn.execute(text(
            "UPDATE agent_config SET router_enabled = false, router_simple_model = 'gpt-4o-mini', router_complex_model = 'gpt-4o-mini', model = 'gpt-4o-mini' WHERE id = 1"
        ))
        await conn.commit()
        print("Updated Agent 1 to use gpt-4o-mini and disabled cost router.")

if __name__ == "__main__":
    asyncio.run(main())
