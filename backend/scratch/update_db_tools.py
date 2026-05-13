import asyncio
import os
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from models import ToolModel, Base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_agent_db")

async def update_tools():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Update transferir_robo
        res_robo = await session.execute(select(ToolModel).where(ToolModel.name == "transferir_robo"))
        tool_robo = res_robo.scalars().first()
        if tool_robo:
            tool_robo.description = "Transfere o atendimento de volta para a central de atendimento. Use quando o atendimento for finalizado ou quando for necessário retomar a automação. Isso reativa as respostas automáticas."
            print("Updated transferir_robo description")
            
        # Update transferir_suporte_humano
        res_human = await session.execute(select(ToolModel).where(ToolModel.name == "transferir_suporte_humano"))
        tool_human = res_human.scalars().first()
        if tool_human:
            tool_human.description = "Transfere o atendimento para um especialista. Use quando o usuário pedir para falar com um atendente, suporte, ou quando você não conseguir resolver o problema."
            print("Updated transferir_suporte_humano description")
            
        await session.commit()
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_tools())
