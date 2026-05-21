import asyncio
import os
import sys

# Adiciona o diretório backend ao path
sys.path.append(os.getcwd())
sys.path.append(os.getcwd() + "/backend")

from database import async_session
from sqlalchemy import text

async def run_migration():
    print("Iniciando migração de colunas de Lead Scoring...")
    async with async_session() as db:
        try:
            # 1. Adiciona coluna qualification_criteria em agent_config
            print("Adicionando coluna qualification_criteria em agent_config...")
            await db.execute(text("ALTER TABLE agent_config ADD COLUMN IF NOT EXISTS qualification_criteria TEXT"))
            await db.commit()
            print("Coluna qualification_criteria adicionada na tabela agent_config.")
        except Exception as e:
            print(f"❌ Erro ao adicionar coluna na tabela agent_config: {e}")

        try:
            # 2. Busca todas as tabelas de leads dinâmicas em webhook_configs
            print("Buscando tabelas de leads dinâmicas...")
            res = await db.execute(text("SELECT DISTINCT leads_table FROM webhook_configs"))
            tables = [r[0] for r in res.fetchall() if r[0]]
            
            # Adiciona a tabela padrão 'leads'
            tables_to_migrate = set(tables)
            tables_to_migrate.add("leads")
            
            for table in tables_to_migrate:
                if table:
                    print(f"Migrando tabela {table} (adicionando colunas de score)...")
                    try:
                        await db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS lead_score INTEGER"))
                        await db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS lead_classification VARCHAR(50)"))
                        await db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS lead_justification TEXT"))
                        await db.commit()
                        print(f"Tabela {table} migrada com sucesso.")
                    except Exception as e:
                        print(f"❌ Erro ao migrar tabela {table}: {e}")
        except Exception as e:
            print(f"❌ Erro ao buscar tabelas de leads: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
