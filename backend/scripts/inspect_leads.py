import asyncio
import os
import sys
from sqlalchemy import text, select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session
from models import WebhookConfigModel

async def inspect():
    print("🔍 Varrendo todas as configurações de webhooks e tabelas de leads...")
    async with async_session() as db:
        # 1. Buscar configs de webhooks
        res_configs = await db.execute(select(WebhookConfigModel))
        configs = res_configs.scalars().all()
        
        res_now = await db.execute(text("SELECT NOW(), NOW() - INTERVAL '24 hours'"))
        db_now, db_cutoff = res_now.fetchone()
        print(f"⏰ Postgres NOW(): {db_now}")
        print(f"⏰ Postgres Cutoff (NOW - 24h): {db_cutoff}")
        
        for cfg in configs:
            table_name = cfg.leads_table or "leads"
            print(f"\n────────────────────────────────────────────────────────")
            print(f"📡 Webhook Config ID: {cfg.id} | Nome: {cfg.name} | Tabela: {table_name}")
            print(f"   Etiqueta 24h configurada para remover (window_close_label): {cfg.window_close_label}")
            
            try:
                # Obter colunas da tabela
                res_cols = await db.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_name}'"))
                cols = [r[0] for r in res_cols.fetchall()]
                print(f"   Colunas na tabela '{table_name}': {cols}")
                
                # Buscar leads
                res_leads = await db.execute(text(f"""
                    SELECT id, contato_nome, telefone, ultima_mensagem_em, window_close_processed, conversa_id, conta_id 
                    FROM {table_name}
                    ORDER BY ultima_mensagem_em DESC
                """))
                leads = res_leads.fetchall()
                print(f"   Total de leads encontrados na tabela: {len(leads)}")
                
                for row in leads:
                    lid, nome, tel, ult_msg, processed, conv_id, acc_id = row
                    db_now_naive = db_now.replace(tzinfo=None) if db_now else None
                    db_cutoff_naive = db_cutoff.replace(tzinfo=None) if db_cutoff else None
                    
                    diff = (db_now_naive - ult_msg) if ult_msg and db_now_naive else None
                    is_expired = ult_msg < db_cutoff_naive if ult_msg and db_cutoff_naive else False
                    print(f"   - Lead ID: {lid} | Nome: {nome} | Tel: {tel}")
                    print(f"     Última Msg: {ult_msg} (Diferença: {diff}) | Expirou (>24h)?: {is_expired}")
                    print(f"     Window Close Processed: {processed} | Conversa ID: {conv_id} | Conta ID: {acc_id}")
            except Exception as e:
                print(f"   ⚠️ Erro ao acessar tabela '{table_name}': {e}")

if __name__ == "__main__":
    asyncio.run(inspect())
