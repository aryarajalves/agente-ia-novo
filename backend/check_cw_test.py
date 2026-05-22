import os
import sys
import json
import httpx

from database.connection import SessionLocal
from models import WebhookConfigModel

def check_inboxes():
    db = SessionLocal()
    try:
        config = db.query(WebhookConfigModel).order_by(WebhookConfigModel.id.desc()).first()
        if not config:
            print("Nenhuma configuração de webhook encontrada.")
            return

        cw_url = config.chatwoot_url or os.getenv("CHATWOOT_URL", "")
        cw_token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
        
        url = cw_url.rstrip("/")
        headers = {"api_access_token": cw_token, "Content-Type": "application/json"}
        
        print("\nListando inboxes da conta 1...")
        resp = httpx.get(f"{url}/api/v1/accounts/1/inboxes", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            payload = data if isinstance(data, list) else data.get("payload", [])
            print(f"Total de inboxes encontrados: {len(payload)}")
            for ib in payload:
                print(f"  - Inbox ID: {ib.get('id')} | Nome: {ib.get('name')} | Canal: {ib.get('channel_type')}")
        else:
            print(f"Erro ao obter inboxes: {resp.status_code} - {resp.text}")

    except Exception as e:
        print(f"Erro geral: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_inboxes()
