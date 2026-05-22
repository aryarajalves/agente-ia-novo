import os
import sys

from database.connection import SessionLocal
from models import WebhookConfigModel

def list_configs():
    db = SessionLocal()
    try:
        configs = db.query(WebhookConfigModel).all()
        print(f"Total configs: {len(configs)}")
        for config in configs:
            print(f"ID: {config.id}")
            print(f"  Nome: {config.name}")
            print(f"  Token: {config.token}")
            print(f"  Chatwoot URL: {config.chatwoot_url}")
            print(f"  Chatwoot Token: {config.chatwoot_api_token}")
            print(f"  Deletar Palavras-chave: {config.delete_keywords}")
            print(f"  Deletar Mensagem: {config.delete_message}")
            print(f"  Deletar Labels: {config.delete_labels}")
            print(f"  Leads Table: {config.leads_table}")
            print(f"  Ativo: {config.is_active}")
            print("-" * 40)
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_configs()
