import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock, AsyncMock
import json

class MockOpenAICompletion:
    def __init__(self, content):
        self.choices = [MagicMock(message=MagicMock(content=content))]

MOCK_RESPONSE = json.dumps({
    "factors": [{"title": "Persona", "explanation": "Definido no prompt.", "section": "static", "relevance": "high"}],
    "summary": "IA respondeu conforme configurado."
})

@pytest.mark.asyncio
async def test_explain_response_success(client: AsyncClient):
    payload = {"user_message": "Qual o preco?", "agent_response": "Custa R$197", "resolved_prompt": "Voce e assistente"}
    mc = AsyncMock()
    # Mock return value do completion
    mock_completion = MockOpenAICompletion(MOCK_RESPONSE)
    mock_completion.usage = MagicMock(prompt_tokens=100, completion_tokens=50, cached_tokens=0)
    mc.chat.completions.create = AsyncMock(return_value=mock_completion)
    with patch("agent_core.clients.get_openai_client", return_value=mc):
        r = await client.post("/explain-response", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "factors" in data
    assert "summary" in data
    assert "cost_usd" in data
    assert "cost_brl" in data

@pytest.mark.asyncio
async def test_explain_response_schema_validation(client: AsyncClient):
    r = await client.post("/explain-response", json={"x": "y"})
    assert r.status_code == 422

@pytest.mark.asyncio
async def test_explain_response_openai_error(client: AsyncClient):
    payload = {"user_message": "Teste", "agent_response": "Resp", "resolved_prompt": "Prompt"}
    mc = AsyncMock()
    mc.chat.completions.create = AsyncMock(side_effect=Exception("timeout"))
    with patch("agent_core.clients.get_openai_client", return_value=mc):
        r = await client.post("/explain-response", json=payload)
    assert r.status_code == 500

@pytest.mark.asyncio
async def test_explain_response_without_prompt(client: AsyncClient):
    payload = {"user_message": "Ola", "agent_response": "Ola!"}
    mc = AsyncMock()
    mock_completion = MockOpenAICompletion(MOCK_RESPONSE)
    mock_completion.usage = MagicMock(prompt_tokens=50, completion_tokens=25, cached_tokens=0)
    mc.chat.completions.create = AsyncMock(return_value=mock_completion)
    with patch("agent_core.clients.get_openai_client", return_value=mc):
        r = await client.post("/explain-response", json=payload)
    assert r.status_code == 200

@pytest.mark.asyncio
async def test_explain_debate_success(client: AsyncClient):
    payload = {
        "user_message": "Qual o preco?",
        "agent_response": "Custa R$197",
        "resolved_prompt": "Voce e assistente",
        "question": "Por que respondeu 197 e nao 150?",
        "debate_history": []
    }
    mc = AsyncMock()
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock(message=MagicMock(content="Foi definido no prompt."))]
    mock_completion.usage = MagicMock(prompt_tokens=150, completion_tokens=40, cached_tokens=0)
    mc.chat.completions.create = AsyncMock(return_value=mock_completion)
    with patch("agent_core.clients.get_openai_client", return_value=mc):
        r = await client.post("/explain-debate", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "response" in data
    assert "cost_usd" in data
    assert "cost_brl" in data
    assert len(data["debate_history"]) == 2

