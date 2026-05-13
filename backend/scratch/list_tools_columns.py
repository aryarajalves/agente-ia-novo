import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_agent_db")

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='tools';
        """))
        columns = result.fetchall()
        print(f"Columns in 'tools' table: {[c[0] for c in columns]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
