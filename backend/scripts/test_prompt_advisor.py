import requests
import json
import os

# Configuration
BASE_URL = "http://localhost:8002"
TEST_PROMPT = """# PERSONA
Você é um atendente de pizzaria.
# TOM DE VOZ
Amigável e rápido.
# REGRAS
Nunca dê descontos sem autorização.
# CONTEXTO
Pizzaria do Jaime.
"""

def test_advisor_chat():
    print("\n[TEST] Testando /prompt-chat (Com Agent ID)...")
    payload = {
        "agent_id": 100,
        "current_prompt": TEST_PROMPT,
        "messages": [
            {"role": "user", "content": "Como posso melhorar a parte das regras?"}
        ]
    }
    response = requests.post(f"{BASE_URL}/prompt-chat", json=payload)
    if response.status_code == 200:
        data = response.json()
        print("OK: Sucesso!")
        print(f"Resposta: {data.get('content')[:100]}...")
    else:
        print(f"ERR: Erro: {response.status_code}")
        print(response.text)

def test_apply_suggestions():
    print("\n[TEST] Testando /apply-suggestions (Com Agent ID)...")
    payload = {
        "agent_id": 100,
        "current_prompt": TEST_PROMPT,
        "messages": [
            {"role": "user", "content": "Adicione uma regra sobre não aceitar fiado."},
            {"role": "assistant", "content": "Ok, vou adicionar essa regra."}
        ]
    }
    response = requests.post(f"{BASE_URL}/apply-suggestions", json=payload)
    if response.status_code == 200:
        data = response.json()
        print("OK: Sucesso!")
        print(f"Novo Prompt: {data.get('prompt')[:100]}...")
    else:
        print(f"ERR: Erro: {response.status_code}")
        print(response.text)

def test_search_prompt():
    print("\n[TEST] Testando /search-prompt (Com Agent ID)...")
    payload = {
        "agent_id": 100,
        "system_prompt": TEST_PROMPT,
        "query": "desconto"
    }
    response = requests.post(f"{BASE_URL}/search-prompt", json=payload)
    if response.status_code == 200:
        data = response.json()
        print("OK: Sucesso!")
        print(f"Encontrado: {data.get('found')}")
        if data.get('found'):
            for occ in data.get('occurrences', []):
                print(f"- Linha {occ['line_start']}: {occ['text_snippet']}")
    else:
        print(f"ERR: Erro: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_advisor_chat()
    test_apply_suggestions()
    test_search_prompt()
