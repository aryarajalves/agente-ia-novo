import requests
import json
import time

base_url = "http://localhost:8000/webhooks/receive/zap"

def send_webhook(msg_type, content="Teste de mídia"):
    payload = {
        "event": "message_created",
        "message_type": msg_type,
        "content": content,
        "attachments": [{"file_type": msg_type, "data_url": f"http://example.com/{msg_type}.ext"}],
        "sender": {"id": 123, "name": f"Teste {msg_type.capitalize()}", "phone_number": "5511999999999"},
        "conversation": {"id": 456 + hash(msg_type) % 1000},
        "account": {"id": 1}
    }
    print(f"Enviando webhook tipo: {msg_type}...")
    resp = requests.post(base_url, json=payload)
    print(f"Resposta: {resp.status_code} - {resp.text}")
    return resp.json()

if __name__ == "__main__":
    # 1. Vídeo (Deve ser bloqueado)
    send_webhook("video")
    time.sleep(2)
    
    # 2. Texto (Deve continuar)
    send_webhook("text", "Oi, tudo bem?")
    time.sleep(2)
    
    # 3. Áudio (Deve identificar e parar)
    send_webhook("audio")
