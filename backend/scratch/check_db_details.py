import asyncio
import json
from sqlalchemy import text
from database.connection import engine

async def check_db_details():
    async with engine.connect() as conn:
        print("--- DB DETAILS ---")
        try:
            res = await conn.execute(text("SELECT id, name, leads_table, token FROM webhook_configs"))
            configs = res.fetchall()
            print(f"Total Webhook Configs: {len(configs)}")
            for cfg in configs:
                wid, name, table, token = cfg
                print(f"Config ID: {wid}, Name: {name}, Table: {table}, Token: {token}")
                
                # Check events for this wid
                res_ev = await conn.execute(text("SELECT COUNT(*) FROM webhook_events WHERE webhook_config_id = :wid"), {"wid": wid})
                print(f"  Events: {res_ev.scalar()}")
                
                # Check leads in the table
                try:
                    res_leads = await conn.execute(text(f"SELECT COUNT(*) FROM {table} WHERE webhook_config_id = :wid"), {"wid": wid})
                    print(f"  Leads in {table}: {res_leads.scalar()}")
                    
                    if res_leads.scalar() > 0:
                        res_sample = await conn.execute(text(f"SELECT telefone, contato_nome, created_at FROM {table} WHERE webhook_config_id = :wid LIMIT 5"), {"wid": wid})
                        for l in res_sample.fetchall():
                            print(f"    - Lead: {l[0]} ({l[1]}) created at {l[2]}")
                except Exception as e:
                    print(f"  Error checking table {table}: {e}")
        except Exception as e:
            print(f"Error checking webhook_configs: {e}")

if __name__ == "__main__":
    asyncio.run(check_db_details())
