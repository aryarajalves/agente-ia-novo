import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_agent_db")

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Checking for column 'confirmation_message' in table 'tools'...")
        try:
            # Check if column exists
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='tools' AND column_name='confirmation_message';
            """))
            column_exists = result.fetchone()
            
            if not column_exists:
                print("Column 'confirmation_message' missing. Adding it...")
                await conn.execute(text("ALTER TABLE tools ADD COLUMN confirmation_message TEXT;"))
                print("Column 'confirmation_message' added successfully.")
            else:
                print("Column 'confirmation_message' already exists.")
        except Exception as e:
            print(f"Error during migration: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
