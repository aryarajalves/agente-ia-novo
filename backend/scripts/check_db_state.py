import asyncio
from database import async_session
from models import WebhookConfigModel, WebhookEventModel, AgentConfigModel
from sqlalchemy import select

async def check():
    async with async_session() as db:
        res_agents = await db.execute(select(AgentConfigModel))
        agents = res_agents.scalars().all()
        print(f"Agents found: {[a.id for a in agents]}")
        
        res = await db.execute(select(WebhookConfigModel))
        webhooks = res.scalars().all()
        print(f"Webhooks found: {[w.name for w in webhooks]}")
        for w in webhooks:
            print(f"Webhook: {w.name}, ID: {w.id}, Token: {w.token}, AgentID: {w.agent_id}, Active: {w.is_active}")
            from sqlalchemy import text
            try:
                res_cols = await db.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{w.leads_table}'"))
                cols = [r[0] for r in res_cols.fetchall()]
                print(f"     Columns in '{w.leads_table}': {cols}")
                
                res_leads = await db.execute(text(f"SELECT COUNT(*) FROM {w.leads_table} WHERE webhook_config_id = :wid"), {"wid": w.id})
                count = res_leads.scalar()
                print(f"  -> Leads in '{w.leads_table}': {count}")
                if count > 0:
                    res_latest = await db.execute(text(f"SELECT telefone, contato_nome, created_at, pode_enviar_mensagem FROM {w.leads_table} ORDER BY created_at DESC"))
                    for l in res_latest.fetchall():
                        print(f"     Lead: {l[0]}, Name: {l[1]}, Date: {l[2]}, PodeEnviar: {l[3]}")
            except Exception as e:
                print(f"  -> Error reading leads table '{w.leads_table}': {e}")
            
        res_events = await db.execute(select(WebhookEventModel).order_by(WebhookEventModel.id.desc()).limit(100))
        events = res_events.scalars().all()
        print(f"Total events: {len(events)}")
        for e in events:
            print(f"Event ID: {e.id}, WebhookID: {e.webhook_config_id}, Phone: {e.telefone}, Msg: {e.mensagem}, Status: {e.status}")

if __name__ == "__main__":
    asyncio.run(check())
