import asyncio
import sys
import os

# Adiciona o diretório atual ao path para importar database/models
sys.path.append(os.getcwd())

from database import SessionLocal
from models import AgentConfigModel

async def check():
    db = SessionLocal()
    agent = db.query(AgentConfigModel).first()
    if agent:
        print("--- SYSTEM PROMPT ---")
        print(agent.system_prompt)
        print("----------------------")
    else:
        print("Nenhum agente encontrado.")
    db.close()

if __name__ == "__main__":
    asyncio.run(check())
