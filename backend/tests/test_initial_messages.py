import pytest
import json
from unittest.mock import MagicMock, AsyncMock
from agent_core.core import process_message
from agent_core.logic.pre_router import run_pre_router_ai

class MockConfig:
    def __init__(self, **kwargs):
        self.id = 1
        self.name = "Test Agent"
        self.model = "gpt-4o-mini"
        self.system_prompt = "You are a helpful assistant."
        self.initial_message = "Olá! Como posso ajudar?"
        self.initial_question_message = "Você possui mais alguma dúvida?"
        self.initial_ignore_message = json.dumps(["Quero saber mais sobre o Laser Day", "Teste de Anuncio"])
        self.context_window = 5
        self.model_settings = "{}"
        self.router_enabled = False
        self.date_awareness = False
        for k, v in kwargs.items():
            setattr(self, k, v)

@pytest.mark.asyncio
async def test_greeting_shortcut():
    config = MockConfig()
    # Mocking openai is not strictly needed for shortcuts but good practice
    # However, pre_router returns early for shortcuts.
    
    # Test "Oi"
    result = await run_pre_router_ai("Oi", [], config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == config.initial_message

@pytest.mark.asyncio
async def test_ad_shortcut():
    config = MockConfig()
    
    # Test Ad Message exactly as configured
    result = await run_pre_router_ai("Quero saber mais sobre o Laser Day", [], config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == config.initial_message

@pytest.mark.asyncio
async def test_ad_shortcut_case_insensitive():
    config = MockConfig()
    
    # Test Ad Message with different case
    result = await run_pre_router_ai("quero saber mais sobre o laser day", [], config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == config.initial_message

@pytest.mark.asyncio
async def test_initial_question_append():
    config = MockConfig()
    # We need to mock the completion call for the main agent
    # process_message calls get_openai_client
    
    from agent_core.core import get_openai_client
    import agent_core.core as core_module
    
    mock_client = AsyncMock()
    mock_completion = AsyncMock()
    mock_completion.choices = [MagicMock(message=MagicMock(content="O Laser Day é um método incrível.", tool_calls=None))]
    mock_completion.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
    mock_client.chat.completions.create.return_value = mock_completion
    
    core_module.get_openai_client = MagicMock(return_value=mock_client)
    
    # Mock pre-router to return NOT a greeting
    core_module.run_pre_router_ai = AsyncMock(return_value={
        "eh_saudacao": False,
        "perguntas_extraidas": "Como funciona o Laser Day?"
    })

    result = await process_message("Como funciona o Laser Day?", [], config)
    
    assert "O Laser Day é um método incrível." in result["content"]
    assert config.initial_question_message in result["content"]
    assert result["content"].endswith(config.initial_question_message)

@pytest.mark.asyncio
async def test_no_append_if_not_first_msg():
    config = MockConfig()
    
    from agent_core.core import get_openai_client
    import agent_core.core as core_module
    
    mock_client = AsyncMock()
    mock_completion = AsyncMock()
    mock_completion.choices = [MagicMock(message=MagicMock(content="Entendido.", tool_calls=None))]
    mock_completion.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
    mock_client.chat.completions.create.return_value = mock_completion
    
    core_module.get_openai_client = MagicMock(return_value=mock_client)
    
    # History is NOT empty
    history = [{"role": "user", "content": "Oi"}, {"role": "assistant", "content": "Olá"}]
    
    # Mock pre-router to return NOT a greeting
    core_module.run_pre_router_ai = AsyncMock(return_value={
        "eh_saudacao": False,
        "perguntas_extraidas": "Tudo bem?"
    })

    result = await process_message("Tudo bem?", history, config)
    
    assert "Entendido." in result["content"]
    assert config.initial_question_message not in result["content"]
