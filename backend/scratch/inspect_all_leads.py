import asyncio
import os
import sys
import json
from sqlalchemy import text, select

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session
from models import WebhookConfigModel

async def inspect():
    print("🔍 Varrendo todas as tabelas de todas as configurações de webhooks...")
    async with async_session() as db:
        res_configs = await db.execute(select(WebhookConfigModel))
        configs = res_configs.scalars().all()
        print(f"Total de Webhook Configs cadastradas: {len(configs)}")
        
        for cfg in configs:
            print(f"\n========================================================")
            print(f"📡 Config ID: {cfg.id} | Nome: {cfg.name} | Tabela: {cfg.leads_table}")
            print(f"   Chatwoot URL: {cfg.chatwoot_url}")
            print(f"   Window Close Label: {cfg.window_close_label}")
            
            if not cfg.leads_table:
                print("   ⚠️ Sem tabela de leads definida.")
                continue
                
            try:
                res_leads = await db.execute(text(f"""
                    SELECT id, contato_nome, telefone, conversa_id, conta_id, labels, ultima_mensagem_em, window_close_processed
                    FROM {cfg.leads_table}
                """))
                leads = res_leads.fetchall()
                print(f"   Leads na tabela '{cfg.leads_table}': {len(leads)}")
                for row in leads:
                    print(f"   - ID: {row[0]} | Nome: {row[1]} | Tel: {row[2]} | ConvID: {row[3]} | ContaID: {row[4]} | Labels: {row[5]} | UltMsg: {row[6]} | Processed: {row[7]}")
            except Exception as e:
                print(f"   ⚠️ Erro ao consultar {cfg.leads_table}: {e}")

if __name__ == "__main__":
    asyncio.run(inspect())
