import asyncio
from sqlalchemy import text
from database.connection import engine

async def check_db():
    async with engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT COUNT(*) FROM webhook_events"))
            print(f"Total webhook_events: {res.scalar()}")
        except Exception as e:
            print(f"Error checking webhook_events: {e}")
            
        try:
            res = await conn.execute(text("SELECT leads_table FROM webhook_configs"))
            tables = [r[0] for r in res.fetchall()]
            for t in tables:
                try:
                    res2 = await conn.execute(text(f"SELECT COUNT(*) FROM {t}"))
                    print(f"Total leads in {t}: {res2.scalar()}")
                except Exception as e:
                    print(f"Error checking table {t}: {e}")
        except Exception as e:
            print(f"Error checking webhook_configs: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
