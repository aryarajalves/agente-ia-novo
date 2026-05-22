import os
from database.connection import SessionLocal
from models import AgentConfigModel, WebhookConfigModel

def dump():
    db = SessionLocal()
    try:
        agents = db.query(AgentConfigModel).all()
        print(f"Total Agentes cadastrados: {len(agents)}")
        for agent in agents:
            print(f"--- Agente ID {agent.id}: {agent.name} ---")
            print(f"Ativo: {agent.is_active}")
            print(f"Modelo: {agent.model}")
            print(f"Initial Message: {agent.initial_message}")
            print(f"Knowledge Base (IDs): {agent.knowledge_base}")
            print("System Prompt:")
            print(agent.system_prompt)
            print("-" * 50)
            
        webhooks = db.query(WebhookConfigModel).all()
        print(f"\nTotal Webhooks cadastrados: {len(webhooks)}")
        for wh in webhooks:
            print(f"--- Webhook ID {wh.id}: {wh.name} ---")
            print(f"Agent ID: {wh.agent_config_id if hasattr(wh, 'agent_config_id') else 'N/A'}")
            print(f"Ativo: {wh.is_active}")
            print("-" * 50)
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    dump()
