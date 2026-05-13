import requests
import time
import json

URL = "http://localhost:8002/webhooks/receive/zap" # Ajuste o Token conforme necessário
HEADERS = {"Content-Type": "application/json"}

def send_msg(text, msg_type="text", link=None):
    payload = {
        "contacts": [{"profile": {"name": "Teste Agrupamento"}, "wa_id": "5511999999999"}],
        "messages": [{
            "from": "5511999999999",
            "id": f"msg_{int(time.time() * 1000)}",
            "timestamp": str(int(time.time())),
            "type": msg_type,
            "text": {"body": text} if msg_type == "text" else None,
            "audio": {"id": "audio_123", "link": link} if msg_type == "audio" else None
        }]
    }
    print(f"Enviando {msg_type}: {text}")
    res = requests.post(URL, json=payload, headers=HEADERS)
    print(f"Status: {res.status_code}, Body: {res.text}")
    return res

if __name__ == "__main__":
    print("--- INICIANDO TESTE DE AGRUPAMENTO ---")
    
    # 1. Enviar mensagem de texto
    send_msg("Oi, tudo bem?")
    time.sleep(2)
    
    # 2. Enviar áudio (Simulado)
    # Nota: O processamento real do áudio falhará se o link for inválido, 
    # mas a lógica de agrupamento deve funcionar.
    send_msg("Áudio simulado", msg_type="audio", link="https://example.com/audio.mp3")
    time.sleep(2)
    
    # 3. Enviar texto final
    send_msg("Consegue me ajudar?")
    
    print("\n--- TESTE FINALIZADO ---")
    print("Verifique o dashboard para validar se as mensagens foram agrupadas e se apenas uma resposta foi gerada.")
