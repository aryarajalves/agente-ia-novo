import os
from dotenv import load_dotenv
load_dotenv("../.env")

import asyncio
from sqlalchemy import select
from database import async_session
from models import SupportRequestModel

async def check_support_requests():
    async with async_session() as session:
        result = await session.execute(select(SupportRequestModel).order_by(SupportRequestModel.created_at.desc()).limit(10))
        requests = result.scalars().all()
        for r in requests:
            print(f"ID: {r.id}, Name: {r.user_name}, Status: {r.status}, Account: {r.account_id}, Conv: {r.conversation_id}, Date: {r.created_at}")

if __name__ == "__main__":
    asyncio.run(check_support_requests())
