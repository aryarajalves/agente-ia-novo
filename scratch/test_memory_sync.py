import asyncio
import httpx
import json

async def test_memory_sync():
    # Configurações do teste
    webhook_token = "TEST_TOKEN_123" # Precisamos de um token real ou injetar no DB
    base_url = "http://localhost:8000"
    
    # Exemplo de payload que será enviado
    payload = {
        "user_info": {
            "phone": "5511999999999",
            "full_name": "Antigravity Test User"
        },
        "details": {
            "interest": "AI Automation",
            "budget": "5000"
        }
    }
    
    print(f"Enviando webhook para {base_url}/webhooks/receive/{webhook_token}...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{base_url}/webhooks/receive/{webhook_token}",
                json=payload
            )
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Erro ao enviar webhook: {e}")

if __name__ == "__main__":
    # Nota: Este script assume que o servidor está rodando e o token existe.
    # Para um teste real em produção/dev, precisamos garantir o token.
    asyncio.run(test_memory_sync())
