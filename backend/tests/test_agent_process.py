import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from agent import process_message
from config_store import AgentConfig

@pytest.fixture
def mock_config():
    return AgentConfig(
        id=1,
        name="Test Agent",
        system_prompt="You are a test agent.",
        model="gpt-4o-mini",
        router_enabled=False,
        date_awareness=False,
        handoff_enabled=False
    )

# Classes de Mock consistentes para evitar comportamentos inesperados de MagicMock
class MockMessage:
    def __init__(self, content, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls

class MockChoice:
    def __init__(self, content, tool_calls=None):
        self.message = MockMessage(content, tool_calls)
        
class MockResponse:
    def __init__(self, content, tool_calls=None, prompt_tokens=5, completion_tokens=5):
        self.choices = [MockChoice(content, tool_calls)]
        self.usage = MagicMock(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens)

@pytest.mark.asyncio
async def test_process_message_basic(mock_config):
    message = "Hello"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "Hello"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Hi there!"))
        
        result = await process_message(message, history, mock_config)
        
        assert "Hi there!" in str(result["content"])
        assert result["usage"].prompt_tokens == 5
        assert result["error"] is False

@pytest.mark.asyncio
async def test_process_message_with_tools(mock_config):
    message = "What's the weather?"
    history = []
    
    mock_tool = MagicMock()
    mock_tool.name = "get_weather"
    mock_tool.description = "Get weather"
    mock_tool.parameters_schema = json.dumps({
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"]
    })
    mock_tool.webhook_url = "http://weather.api/call"
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router, \
         patch("httpx.AsyncClient.post") as mock_post:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": message}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # 1. Turn 1: Model calls the tool
        mock_call = MagicMock()
        mock_call.id = "call_123"
        mock_call.function.name = "get_weather"
        mock_call.function.arguments = json.dumps({"location": "Recife"})
        
        resp1 = MockResponse(None, [mock_call], prompt_tokens=10, completion_tokens=5)
        
        # 2. Turn 2: Model responds after tool output
        resp2 = MockResponse("It's sunny in Recife", None, prompt_tokens=20, completion_tokens=10)
        
        mock_client.chat.completions.create = AsyncMock(side_effect=[resp1, resp2])
        mock_post.return_value = MagicMock(status_code=200, text="Sunny")
        
        result = await process_message(message, history, mock_config, tools=[mock_tool])
        
        assert "Recife" in str(result["content"])
        assert result["usage"].prompt_tokens == 30

@pytest.mark.asyncio
async def test_process_message_handoff(mock_config):
    mock_config.handoff_enabled = True
    message = "I want to talk to a human"
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router, \
         patch("agent_core.core.generate_handoff_summary") as mock_summary:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": message}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_call = MagicMock()
        mock_call.id = "call_handoff"
        mock_call.function.name = "transferir_suporte_humano"
        mock_call.function.arguments = json.dumps({"motivo": "User requested"})
        
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse(None, [mock_call]))
        mock_summary.return_value = "Summary: User wants human"
        
        result = await process_message(message, [], mock_config)
        
        assert "transferindo" in str(result["content"]).lower()
        assert "especializada" in str(result["content"]).lower()
        assert result["handoff_data"]["handoff"] is True
        assert result["handoff_data"]["destino"] == "humano"

@pytest.mark.asyncio
async def test_process_message_error_handling(mock_config):
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "hi"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API Down"))
        
        result = await process_message("hi", [], mock_config)
        assert result["error"] is True
        assert "instabilidade" in result["content"] or "API Down" in result["content"]

@pytest.mark.asyncio
async def test_process_message_fallback(mock_config):
    mock_config.fallback_model = "gpt-4o-mini-fallback"
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
        
        mock_pre_router.return_value = {"eh_saudacao": False, "id_agente_alvo": 1, "perguntas_extraidas": "hi"}
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_client.chat.completions.create = AsyncMock(side_effect=[Exception("Main Failed"), MockResponse("Hi from fallback")])
        
        result = await process_message("hi", [], mock_config)
        assert "fallback" in str(result["content"])
        assert result["error"] is False
