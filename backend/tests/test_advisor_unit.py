import pytest
from httpx import AsyncClient
import os
import json

# Simula o ambiente para testes
os.environ["AGENT_API_KEY"] = "a0c10372-af47-4a36-932a-9b1acdb59366"

@pytest.mark.asyncio
async def test_advisor_endpoint_success():
    """Testa se o endpoint do advisor responde corretamente."""
    from main import app
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "prompt_content": "Você é um atendente.",
            "user_query": "Oi, tudo bem?",
            "history": []
        }
        headers = {"X-API-Key": os.environ["AGENT_API_KEY"]}
        response = await ac.post("/api/prompt/advisor", json=payload, headers=headers)
        
    assert response.status_code == 200
    data = response.json()
    assert "content" in data
    assert "cost_brl" in data

@pytest.mark.asyncio
async def test_advisor_with_special_chars_in_prompt():
    """Testa se prompts com chaves { } (que causavam KeyError) agora funcionam."""
    from main import app
    from httpx import ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "prompt_content": "Olá {nome}, seu saldo é {saldo}.",
            "user_query": "Analise este prompt.",
            "history": []
        }
        headers = {"X-API-Key": os.environ["AGENT_API_KEY"]}
        response = await ac.post("/api/prompt/advisor", json=payload, headers=headers)
        
    assert response.status_code == 200
    assert "content" in response.json()
