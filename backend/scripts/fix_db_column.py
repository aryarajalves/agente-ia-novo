import asyncio
from sqlalchemy import text
from database import engine

async def ensure_columns():
    async with engine.begin() as conn:
        try:
            # Tenta adicionar a coluna. Se já existir, vai dar erro mas o try/except segura.
            await conn.execute(text("ALTER TABLE tools ADD COLUMN confirmation_message TEXT"))
            print("✅ Coluna confirmation_message adicionada com sucesso.")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("ℹ️ Coluna confirmation_message já existe.")
            else:
                print(f"❌ Erro ao adicionar coluna: {e}")

if __name__ == "__main__":
    asyncio.run(ensure_columns())
