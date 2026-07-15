"""
add_tool_prompts_column.py
==============================================================
Script de migração para adicionar a coluna tool_prompts na tabela agent_config.
"""
import asyncio
import os
import sys

# Garante que o path do backend está acessível
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("Adicionando coluna tool_prompts à tabela agent_config...")
        try:
            # SQLite e PostgreSQL possuem sintaxes compatíveis para ADD COLUMN se não houver constraints rígidas
            await conn.execute(text("ALTER TABLE agent_config ADD COLUMN tool_prompts JSON NULL;"))
            print("✅ Coluna tool_prompts adicionada com sucesso!")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ A coluna tool_prompts já existe na tabela agent_config.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
