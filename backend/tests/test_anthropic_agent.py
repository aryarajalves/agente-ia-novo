import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock
from agent import process_message
from config_store import AgentConfig

# Mock for Anthropic Client
class MockAnthropicResponse:
    def __init__(self, content, tool_calls=None):
        self.content = [MagicMock(type="text", text=content)]
        if tool_calls:
            self.content.extend([
                MagicMock(type="tool_use", id=tc["id"], name=tc["name"], input=tc["input"])
                for tc in tool_calls
            ])
        self.stop_reason = "end_turn" if not tool_calls else "tool_use"
        self.model = "claude-3-5-sonnet-20240620"
        self.usage = MagicMock(input_tokens=10, output_tokens=20)

@pytest.mark.asyncio
async def test_anthropic_process_message_basic():
    """Testa uma interação básica com o Claude (Anthropic)."""
    agent_config = AgentConfig(
        id=1,
        name="Claude Agent",
        model="claude-4.6-sonnet",
        temperature=0.7,
        system_prompt="You are Claude."
    )
    
    # Mock do cliente Anthropic
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=MockAnthropicResponse("Hello, I am Claude."))
    
    with patch("agent.AsyncAnthropic", return_value=mock_client), \
         patch("agent.get_openai_client", return_value=None):
        
        result = await process_message("Hi", [], agent_config, tools=[])
        
        assert result["content"] == "Hello, I am Claude."
        assert "claude" in result["model"]
        assert result["usage"].prompt_tokens == 10
        mock_client.messages.create.assert_called_once()

@pytest.mark.asyncio
async def test_anthropic_tool_use():
    """Testa o uso de ferramentas com o Claude."""
    agent_config = AgentConfig(
        id=1,
        name="Tool Agent",
        model="claude-4.6-sonnet",
        temperature=0.0
    )
    
    tools = [
        MagicMock(id=1, name="get_weather", description="Get weather", parameters_schema='{"type":"object","properties":{"city":{"type":"string"}}}')
    ]
    
    # sequence of responses: 1. Tool Call, 2. Final response
    res1 = MockAnthropicResponse("", tool_calls=[{"id": "tc_1", "name": "get_weather", "input": {"city": "Porto Alegre"}}])
    res2 = MockAnthropicResponse("Está ensolarado em Porto Alegre.")
    
    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(side_effect=[res1, res2])
    
    # Mock da execução da ferramenta
    mock_tool_exec = AsyncMock(return_value="Ensolarado, 25°C")
    
    with patch("agent.AsyncAnthropic", return_value=mock_client), \
         patch("agent.execute_tool", mock_tool_exec):
        
        result = await process_message("Como está o tempo em Porto Alegre?", [], agent_config, tools=tools)
        
        assert result["content"] == "Está ensolarado em Porto Alegre."
        assert mock_client.messages.create.call_count == 2
        mock_tool_exec.assert_called_once()
        
        # Verifica se o tool_result foi enviado corretamente no segundo call
        second_call_args = mock_client.messages.create.call_args_list[1][1]
        messages = second_call_args["messages"]
        last_msg = messages[-1]
        assert last_msg["role"] == "user"
        assert last_msg["content"][0]["type"] == "tool_result"
        assert last_msg["content"][0]["content"] == "Ensolarado, 25°C"
