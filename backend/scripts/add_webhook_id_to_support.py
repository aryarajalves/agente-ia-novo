import asyncio
import os
from sqlalchemy import text
from database.connection import engine

async def migrate():
    print("🚀 Iniciando migração: Adicionando webhook_config_id a support_requests...")
    async with engine.begin() as conn:
        try:
            # Tenta adicionar a coluna. Se já existir, o SQLAlchemy/Postgres vai avisar.
            await conn.execute(text("ALTER TABLE support_requests ADD COLUMN webhook_config_id INTEGER REFERENCES webhook_configs(id) ON DELETE SET NULL"))
            print("✅ Coluna webhook_config_id adicionada com sucesso!")
        except Exception as e:
            if "already exists" in str(e):
                print("ℹ️ A coluna webhook_config_id já existe. Pulando...")
            else:
                print(f"❌ Erro na migração: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
