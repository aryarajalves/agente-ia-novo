import asyncio
from database import get_db
from sqlalchemy import text

async def run():
    # Obtém o session maker
    async for db in get_db():
        try:
            # Lista todas as tabelas no postgres
            res = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
            tables = [r[0] for r in res.fetchall()]
            print("TABELAS EXISTENTES NO BANCO:")
            for t in sorted(tables):
                print(f" - {t}")
            
            # Lista os webhooks
            print("\nWEBHOOKS CONFIGURADOS:")
            res_configs = await db.execute(text("SELECT id, name, leads_table FROM webhook_configs"))
            configs = res_configs.fetchall()
            for cfg in configs:
                wid, name, leads_table = cfg
                print(f"Webhook ID={wid}, Nome={name}, Tabela={leads_table}")
                if leads_table:
                    if leads_table in tables:
                        res_count = await db.execute(text(f"SELECT COUNT(*) FROM {leads_table}"))
                        print(f"   -> Tabela '{leads_table}' existe. Total de linhas: {res_count.scalar()}")
                    else:
                        print(f"   -> ERRO: Tabela '{leads_table}' NÃO EXISTE NO BANCO!")
        except Exception as e:
            print(f"Erro durante a verificação: {e}")
        break

if __name__ == "__main__":
    asyncio.run(run())
