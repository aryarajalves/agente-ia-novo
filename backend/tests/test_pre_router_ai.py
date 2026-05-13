import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from webhook_tasks import run_pre_router_ai
from models import AgentConfigModel

@pytest.mark.asyncio
async def test_run_pre_router_ai_greeting():
    # Setup mocks
    main_agent = AgentConfigModel(id=1, name="Main", description="Principal", router_simple_model="gpt-4o-mini")
    secondary_agents = []
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = '{"is_greeting_only": true, "needs_clarification": false, "direct_response": "Olá! Como posso ajudar?", "target_agent_id": 1, "extracted_messages": null, "clarification_response": null}'
    
    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai("Oi, tudo bem?", [], main_agent, secondary_agents)
            
            assert result["is_greeting_only"] is True
            assert result["direct_response"] == "Olá! Como posso ajudar?"

@pytest.mark.asyncio
async def test_run_pre_router_ai_clarification():
    main_agent = AgentConfigModel(id=1, name="Main", description="Principal", router_simple_model="gpt-4o-mini")
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = '{"is_greeting_only": false, "needs_clarification": true, "direct_response": null, "clarification_response": "Você precisa de suporte técnico ou financeiro?", "target_agent_id": 1, "extracted_messages": null}'
    
    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai("Eu preciso de ajuda urgente", [], main_agent, [])
            
            assert result["needs_clarification"] is True
            assert result["clarification_response"] == "Você precisa de suporte técnico ou financeiro?"

@pytest.mark.asyncio
async def test_run_pre_router_ai_question_extraction():
    main_agent = AgentConfigModel(id=1, name="Vendas", description="Vendas", router_simple_model="gpt-4o-mini")
    sec_agent = AgentConfigModel(id=2, name="Suporte", description="Suporte Tecnico")
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = '{"is_greeting_only": false, "needs_clarification": false, "direct_response": null, "clarification_response": null, "target_agent_id": 2, "extracted_messages": "A internet caiu"}'
    
    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai("Oi! A internet caiu", [], main_agent, [sec_agent])
            
            assert result["is_greeting_only"] is False
            assert result["needs_clarification"] is False
            assert result["target_agent_id"] == 2
            assert result["extracted_messages"] == "A internet caiu"
