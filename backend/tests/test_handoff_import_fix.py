import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from webhook_tasks import _get_cost
from agent_core.core import process_message, handle_chatwoot_handoff
from config_store import AgentConfig

def test_get_cost_with_none_model():
    # Test that _get_cost handles None or non-string model values gracefully without raising AttributeError
    usage = {"prompt_tokens": 100, "completion_tokens": 50}
    
    cost_none = _get_cost(None, usage)
    cost_num = _get_cost(12345, usage)
    
    assert isinstance(cost_none, (int, float))
    assert isinstance(cost_num, (int, float))
    assert cost_none >= 0
    assert cost_num >= 0

def test_handoff_import_is_valid():
    # Test that handle_chatwoot_handoff is correctly imported and is a callable function
    assert handle_chatwoot_handoff is not None
    assert callable(handle_chatwoot_handoff)

@pytest.mark.asyncio
async def test_exception_handling_in_process_message():
    # Test that when process_message encounters an exception inside its loop, it safely returns a dictionary with 'model' fallback
    config = AgentConfig(
        id=1,
        name="Test",
        system_prompt="Test Prompt",
        model="gpt-4o-mini"
    )
    
    # Pre-router mock to bypass early exit
    pre_router_mock = {
        "eh_saudacao": False,
        "precisa_esclarecimento": False,
        "resposta_direta": None,
        "resposta_esclarecimento": None,
        "id_agente_alvo": 1,
        "perguntas_extraidas": None,
        "data_extraida": None,
        "_model_used": "gpt-4o-mini",
        "_usage": {"prompt_tokens": 0, "completion_tokens": 0}
    }
    
    # Mock OpenAI client
    mock_client = MagicMock()
    # Raising an exception inside the execute loop
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("Loop failure"))
    
    with patch("agent_core.core.run_pre_router_ai", return_value=pre_router_mock):
        with patch("agent_core.core.get_openai_client", return_value=mock_client):
            result = await process_message(
                message="Hello",
                history=[],
                config=config,
                db=AsyncMock()
            )
            
            assert result is not None
            assert result.get("error") is True
            assert "instabilidade" in result.get("content") or "Erro interno:" in result.get("content")
            # Must contain 'model' to prevent downstream 'NoneType' errors
            assert result.get("model") == "gpt-4o-mini"
