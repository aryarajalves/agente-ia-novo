import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.core import process_message

@pytest.mark.asyncio
async def test_tool_failure_friendly_message():
    # Mock do agente e configurações
    mock_config = MagicMock()
    mock_config.id = 1
    mock_config.model = "gpt-4o-mini"
    mock_config.system_prompt = "Você é um assistente."
    mock_config.context_window = 5
    mock_config.temperature = 0.7
    mock_config.model_settings = "{}"
    mock_config.router_enabled = False
    mock_config.handoff_enabled = False
    mock_config.initial_question_message = None
    
    # Mock da ferramenta com URL inválida
    mock_tool = MagicMock()
    mock_tool.name = "webhook_falho"
    mock_tool.webhook_url = "url_sem_protocolo"
    mock_tool.parameters_schema = '{"type": "object", "properties": {}}'
    
    tools = [mock_tool]
    
    # Mocks para simular a interação
    mock_tool_call = MagicMock()
    mock_tool_call.id = "call_123"
    mock_tool_call.function.name = "webhook_falho"
    mock_tool_call.function.arguments = "{}"

    mock_msg_1 = MagicMock()
    mock_msg_1.role = "assistant"
    mock_msg_1.content = None
    mock_msg_1.tool_calls = [mock_tool_call]

    mock_msg_2 = MagicMock()
    mock_msg_2.role = "assistant"
    mock_msg_2.content = "Desculpe, houve uma instabilidade técnica. Por favor, tente novamente."
    mock_msg_2.tool_calls = None

    # Mock das completions
    completion_1 = MagicMock()
    completion_1.choices = [MagicMock(message=mock_msg_1)]
    completion_1.usage = MagicMock(prompt_tokens=10, completion_tokens=5)

    completion_2 = MagicMock()
    completion_2.choices = [MagicMock(message=mock_msg_2)]
    completion_2.usage = MagicMock(prompt_tokens=10, completion_tokens=5)

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=[completion_1, completion_2])
    
    mock_db = AsyncMock()
    
    with patch("agent_core.core.get_openai_client", return_value=mock_client), \
         patch("agent_core.core.verify_output_safety", side_effect=lambda x, y: x), \
         patch("agent_core.core.resolve_conditional_blocks", side_effect=lambda x, y: x):
        
        result = await process_message(
            message="teste",
            history=[],
            config=mock_config,
            tools=tools,
            db=mock_db
        )
        
        # O teste passa se o sistema processou os dois turnos e retornou a mensagem final
        assert "instabilidade" in result["content"]
        assert mock_client.chat.completions.create.call_count == 2
