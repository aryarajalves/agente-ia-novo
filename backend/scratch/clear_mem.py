import asyncio
from database.connection import engine
from sqlalchemy import delete
from models import UserMemoryModel

async def clear():
    async with engine.connect() as conn:
        await conn.execute(delete(UserMemoryModel).where(UserMemoryModel.session_id == '6'))
        await conn.commit()

if __name__ == "__main__":
    asyncio.run(clear())
