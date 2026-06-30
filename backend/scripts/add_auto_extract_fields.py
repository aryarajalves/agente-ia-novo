import asyncio
import os
import sys

# Adiciona o diretório backend e o atual ao path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))
sys.path.append("/app")


from database import SessionLocal, engine
from sqlalchemy import text

async def run_migration():
    print("Iniciando migracao: Adicionando colunas de extracao automatica em 'global_context_variables'...")
    try:
        from database import async_session
        
        async with async_session() as db:
            # Tentar adicionar extraction_method
            try:
                await db.execute(text("ALTER TABLE global_context_variables ADD COLUMN extraction_method VARCHAR DEFAULT 'integration'"))
                await db.commit()
                print("Coluna 'extraction_method' adicionada com sucesso.")
            except Exception as e_method:
                await db.rollback()
                if "duplicate column name" in str(e_method).lower() or "already exists" in str(e_method).lower():
                    print("Coluna 'extraction_method' já existe no banco.")
                else:
                    print(f"Erro ao adicionar 'extraction_method': {e_method}")
            
            # Tentar adicionar extraction_prompt
            try:
                await db.execute(text("ALTER TABLE global_context_variables ADD COLUMN extraction_prompt TEXT"))
                await db.commit()
                print("Coluna 'extraction_prompt' adicionada com sucesso.")
            except Exception as e_prompt:
                await db.rollback()
                if "duplicate column name" in str(e_prompt).lower() or "already exists" in str(e_prompt).lower():
                    print("Coluna 'extraction_prompt' já existe no banco.")
                else:
                    print(f"Erro ao adicionar 'extraction_prompt': {e_prompt}")
            
    except Exception as e:
        print(f"❌ Erro na migração geral: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
