import asyncio
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session

async def find():
    print("🔍 Procurando por Michaella ou 5524998432822 em todas as tabelas do banco de dados...")
    async with async_session() as db:
        # Obter todas as tabelas do schema public
        res_tables = await db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """))
        tables = [r[0] for r in res_tables.fetchall()]
        
        found = False
        for table in tables:
            try:
                # Verificar se a tabela tem a coluna telefone ou contato_nome
                res_cols = await db.execute(text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}' AND column_name IN ('telefone', 'contato_nome')
                """))
                cols = [r[0] for r in res_cols.fetchall()]
                if not cols:
                    continue
                    
                # Buscar correspondência
                query_str = f"SELECT * FROM {table} WHERE 1=0"
                if 'telefone' in cols:
                    query_str += " OR telefone LIKE '%5524998432822%' OR telefone LIKE '%5524998432822' OR telefone LIKE '%1228%'"
                if 'contato_nome' in cols:
                    query_str += " OR contato_nome ILIKE '%Michaella%'"
                    
                res_match = await db.execute(text(f"SELECT * FROM {table} WHERE {query_str.split('WHERE 1=0 OR ')[1]}"))
                rows = res_match.fetchall()
                if rows:
                    found = True
                    columns = res_match.keys()
                    print(f"\n🌟 Encontrado na tabela '{table}' ({len(rows)} registros):")
                    for row in rows:
                        row_dict = dict(zip(columns, row))
                        print(row_dict)
            except Exception as e:
                pass
                
        if not found:
            print("❌ Lead não encontrado em nenhuma tabela local.")

if __name__ == "__main__":
    asyncio.run(find())
