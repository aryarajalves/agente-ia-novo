import asyncio
import sys
import os

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.getcwd() + "/backend")

from dotenv import load_dotenv
load_dotenv("backend/.env")

from database import async_session
from models import AgentConfigModel
from sqlalchemy import select

async def check_agent_models(agent_id):
    async with async_session() as db:
        result = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
        agent = result.scalars().first()
        if not agent:
            print(f"Agent {agent_id} not found")
            return
        
        print(f"Agent: {agent.name} (ID: {agent.id})")
        print(f"  - model: {agent.model}")
        print(f"  - fallback_model: {agent.fallback_model}")
        print(f"  - router_complex_model: {agent.router_complex_model}")
        print(f"  - router_complex_fallback_model: {agent.router_complex_fallback_model}")

if __name__ == "__main__":
    asyncio.run(check_agent_models(100))
