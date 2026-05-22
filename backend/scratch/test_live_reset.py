import os
import json
import httpx
from database import engine_sync
from sqlalchemy import text

if __name__ == "__main__":
    url = "https://chatsustentabilidade.jords.site"
    token = "xGJudakMBBa7wGqZYvXvzFdW"
    account_id = "1"
    conversation_id = "6"

    print("--- Testing message sending ---")
    msg_url = f"{url}/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages"
    headers = {"api_access_token": token, "Content-Type": "application/json"}
    payload = {"content": "Zerei a memoria do agente para esse contato. (Teste manual)", "message_type": "outgoing"}

    with httpx.Client() as client:
        r = client.post(msg_url, json=payload, headers=headers)
        print("Message Status:", r.status_code)
        print("Response:", r.text)

    print("\n--- Testing labels update ---")
    labels_url = f"{url}/api/v1/accounts/{account_id}/conversations/{conversation_id}/labels"
    labels_payload = {"labels": ["robo", "whatsapp"]}

    with httpx.Client() as client:
        r = client.post(labels_url, json=labels_payload, headers=headers)
        print("Labels Status:", r.status_code)
        print("Response:", r.text)

