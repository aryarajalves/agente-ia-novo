import asyncio
from database.connection import SessionLocal
from sqlalchemy import text

def run():
    db = SessionLocal()
    try:
        res = db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
        print("TABLES:")
        for r in res:
            print(f"  {r[0]}")
    finally:
        db.close()

if __name__ == '__main__':
    run()
