import asyncio
from sqlalchemy import text
from database.connection import engine

async def migrate():
    async with engine.begin() as conn:
        print("🔍 Verificando se as colunas 'date_awareness_past_days' e 'date_awareness_future_days' existem em 'agent_config'...")
        
        # Check past days column
        res_past = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='agent_config' AND column_name='date_awareness_past_days';"))
        exists_past = res_past.fetchone()
        
        if not exists_past:
            print("🚀 Adicionando coluna 'date_awareness_past_days' à tabela 'agent_config'...")
            await conn.execute(text("ALTER TABLE agent_config ADD COLUMN date_awareness_past_days INTEGER DEFAULT 7;"))
            print("✅ Coluna 'date_awareness_past_days' adicionada com sucesso.")
        else:
            print("✅ Coluna 'date_awareness_past_days' já existe.")
            
        # Check future days column
        res_future = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='agent_config' AND column_name='date_awareness_future_days';"))
        exists_future = res_future.fetchone()
        
        if not exists_future:
            print("🚀 Adicionando coluna 'date_awareness_future_days' à tabela 'agent_config'...")
            await conn.execute(text("ALTER TABLE agent_config ADD COLUMN date_awareness_future_days INTEGER DEFAULT 7;"))
            print("✅ Coluna 'date_awareness_future_days' adicionada com sucesso.")
        else:
            print("✅ Coluna 'date_awareness_future_days' já existe.")

if __name__ == "__main__":
    asyncio.run(migrate())
