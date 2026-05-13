import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def check_db():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("--- Checking Extensions ---")
        res = await conn.execute(text("SELECT extname FROM pg_extension;"))
        extensions = [r[0] for r in res.fetchall()]
        print(f"Extensions: {extensions}")

        print("\n--- Checking knowledge_items table ---")
        try:
            res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'knowledge_items';"))
            columns = res.fetchall()
            for col in columns:
                print(f"Column: {col[0]} | Type: {col[1]}")
        except Exception as e:
            print(f"Error checking knowledge_items: {e}")

        print("\n--- Attempting to add embedding column manually ---")
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.commit()
            print("Extension vector ensured.")
            
            await conn.execute(text("ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS embedding vector(1536)"))
            await conn.commit()
            print("Successfully added embedding column (or it already existed).")
        except Exception as e:
            print(f"FAILED to add embedding column: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
