import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import os
import sys

# Ensure backend dir is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import SupportRequestModel, AgentConfigModel
from agent import sanitize_phone_number
from database import DATABASE_URL

async def test_sanitization():
    print("Testing sanitization...")
    cases = [
        ("(11) 98765-4321", "11987654321"),
        ("+55 11 98888-7777", "5511988887777"),
        ("abc 123 def 456", "123456"),
        (None, ""),
        ("", "")
    ]
    for inp, expected in cases:
        result = sanitize_phone_number(inp)
        print(f"Input: {inp} -> Result: {result} (Expected: {expected})")
        assert result == expected
    print("Sanitization tests passed!\n")

async def verify_db_consistency():
    # Note: This part needs a real DB connection or a mock. 
    # Since we are in the workspace, we can check the most recent SupportRequest
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Just check the last SupportRequest created
        stmt = select(SupportRequestModel).order_by(SupportRequestModel.id.desc()).limit(1)
        result = await session.execute(stmt)
        req = result.scalar_one_or_none()
        
        if req:
            print(f"Latest Support Request ID: {req.id}")
            print(f"Extracted Data: {json.dumps(req.extracted_data, indent=2)}")
            phone = req.extracted_data.get("user_phone")
            print(f"Phone in extracted_data: {phone}")
            if phone and phone != "N/A":
                # Check if it is sanitized (digits only)
                is_safe = phone.isdigit()
                print(f"Is sanitized: {is_safe}")
        else:
            print("No support requests found in DB to verify.")

if __name__ == "__main__":
    asyncio.run(test_sanitization())
    # asyncio.run(verify_db_consistency()) # This might need a live DB
