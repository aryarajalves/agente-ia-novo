import json
from database import SessionLocal
from models import WebhookConfigModel, AgentConfigModel

db = SessionLocal()
try:
    webhooks = db.query(WebhookConfigModel).all()
    print("--- WEBHOOKS CADASTRADOS ---")
    for w in webhooks:
        agent = db.query(AgentConfigModel).filter(AgentConfigModel.id == w.agent_id).first()
        agent_name = agent.name if agent else "Nenhum"
        print(f"ID: {w.id} | Nome: {w.name} | Token: {w.token} | Agente: {agent_name} (ID: {w.agent_id})")
        if agent:
            print(f"  Mensagem Inicial: {agent.initial_message}")
            print(f"  Whitelist de Anúncios: {agent.initial_ignore_message}")
finally:
    db.close()
