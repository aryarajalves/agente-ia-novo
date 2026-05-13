import pytest
from database import get_db
from models import AgentConfigModel
from sqlalchemy.future import select
@pytest.mark.asyncio
async def test_agent_initial_message():
    async for db in get_db():
        result = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == 1))
        agent = result.scalars().first()
        if agent:
            print('DB INITIAL MESSAGE:', agent.initial_message)
        else:
            pytest.skip("Agent with ID 1 not found in database for this test.")
