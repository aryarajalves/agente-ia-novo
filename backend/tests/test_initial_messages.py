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
    assert result["resposta_direta"] == f"{config.initial_message}\n\n{config.initial_question_message}"

@pytest.mark.asyncio
async def test_ad_shortcut():
    config = MockConfig()
    
    # Test Ad Message exactly as configured
    result = await run_pre_router_ai("Quero saber mais sobre o Laser Day", [], config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == f"{config.initial_message}\n\n{config.initial_question_message}"

@pytest.mark.asyncio
async def test_ad_shortcut_case_insensitive():
    config = MockConfig()
    
    # Test Ad Message with different case
    result = await run_pre_router_ai("quero saber mais sobre o laser day", [], config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == f"{config.initial_message}\n\n{config.initial_question_message}"
    assert result["eh_anuncio"] is True

@pytest.mark.asyncio
async def test_ad_shortcut_similarity_high():
    config = MockConfig()
    
    # Anúncio cadastrado: "Quero saber mais sobre o Laser Day" (7 palavras)
    # Mensagem recebida: "quero saber mais sobre o laser" (6 palavras)
    # Palavras em comum: "quero", "saber", "mais", "sobre", "o", "laser" (6 comuns)
    # Similaridade: 6/6 = 100% das palavras da mensagem batem com as do anúncio.
    result = await run_pre_router_ai("quero saber mais sobre o laser", [], config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == f"{config.initial_message}\n\n{config.initial_question_message}"
    assert result["eh_anuncio"] is True
    assert "Similaridade:" in result["detalhe_anuncio"]

@pytest.mark.asyncio
async def test_ad_shortcut_similarity_low():
    config = MockConfig()
    
    # Mensagem recebida: "quero comprar pão e saber mais" (6 palavras)
    # Anúncio: "Quero saber mais sobre o Laser Day"
    # Palavras em comum: "quero", "saber", "mais" (3 comuns)
    # Similaridade: 3/6 = 50% das palavras da mensagem batem com o anúncio.
    # Deve ser classificado como NÃO anúncio (similaridade < 60%)
    # Como não há api key no mock de testes e não é shortcut, ele vai tentar bater no mock de openai se continuar,
    # então vamos validar apenas que run_pre_router_ai não retorna eh_anuncio=True.
    # Para o teste passar sem mockar openai, podemos desativar a chave de API no ambiente de teste temporariamente.
    import os
    original_key = os.environ.get("OPENAI_API_KEY")
    if "OPENAI_API_KEY" in os.environ:
        del os.environ["OPENAI_API_KEY"]
    try:
        result = await run_pre_router_ai("quero comprar pão e saber mais", [], config)
        assert result["eh_saudacao"] is False
        assert result["eh_anuncio"] is False
    finally:
        if original_key:
            os.environ["OPENAI_API_KEY"] = original_key


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

@pytest.mark.asyncio
async def test_no_greeting_or_ad_shortcut_if_not_first_msg():
    config = MockConfig()
    history = [{"role": "user", "content": "Olá"}, {"role": "assistant", "content": "Tudo bem?"}]
    
    # Test "Oi" with history - should now trigger greeting
    result = await run_pre_router_ai("Oi", history, config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == f"{config.initial_message}\n\n{config.initial_question_message}"
    
    # Test Ad message with history - should NOT trigger greeting
    result = await run_pre_router_ai("Quero saber mais sobre o Laser Day", history, config)
    assert result["eh_saudacao"] is False
    assert result["resposta_direta"] is None

@pytest.mark.asyncio
async def test_greeting_in_history_warm_clarification():
    config = MockConfig()
    history = [
        {"role": "user", "content": "Olá"},
        {"role": "assistant", "content": "Olá! Como posso te ajudar?"},
        {"role": "user", "content": "Quero saber os preços"},
        {"role": "assistant", "content": "Nossos preços começam em R$ 99."}
    ]
    
    # Test "ta" with history - should trigger a warm friendly response instead of robotic technical choices
    result = await run_pre_router_ai("ta", history, config)
    assert result["eh_saudacao"] is False
    assert result["precisa_esclarecimento"] is True
    assert result["resposta_esclarecimento"] is not None
    
    # A resposta deve ser acolhedora e não técnica/robótica
    assert "como posso" in result["resposta_esclarecimento"].lower() or "ajudar" in result["resposta_esclarecimento"].lower() or "olá" in result["resposta_esclarecimento"].lower() or "oi" in result["resposta_esclarecimento"].lower()
    assert "cancelar" not in result["resposta_esclarecimento"].lower()
    assert "testar o chat" not in result["resposta_esclarecimento"].lower()


@pytest.mark.asyncio
async def test_ad_with_question_integration():
    config = MockConfig()
    
    # Simula o fluxo:
    # 1. Usuário envia "Quero saber mais sobre o Laser Day. Como funciona o curso?"
    # 2. pre_router identifica o anúncio, remove o trecho "Quero saber mais sobre o Laser Day"
    #    e o restante é enviado no processamento.
    # 3. No final, a resposta do agente deve ter a initial_question_message anexada.
    
    # Mock do OpenAI para o pre_router e o process_message
    from agent_core.core import get_openai_client
    import agent_core.core as core_module
    
    mock_client = AsyncMock()
    mock_completion = AsyncMock()
    mock_completion.choices = [MagicMock(message=MagicMock(content="O curso é online e vitalício.", tool_calls=None))]
    mock_completion.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
    mock_client.chat.completions.create.return_value = mock_completion
    
    core_module.get_openai_client = MagicMock(return_value=mock_client)
    
    # Para o pre-router de fato rodar (quando não entra no atalho programático), 
    # ele precisa da API key e da chamada OpenAI mockada.
    # Vamos mockar o client.chat.completions.create em pre_router.py também.
    import agent_core.logic.pre_router as pre_router_module
    
    mock_pr_client = AsyncMock()
    mock_pr_completion = AsyncMock()
    # A resposta da IA do pre-router deve indicar que não é saudação e extrair a pergunta
    mock_pr_completion.choices = [MagicMock(message=MagicMock(content=json.dumps({
        "eh_saudacao": False,
        "precisa_esclarecimento": False,
        "resposta_direta": None,
        "resposta_esclarecimento": None,
        "id_agente_alvo": 1,
        "perguntas_extraidas": "Como funciona o curso?",
        "data_extraida": None
    }), tool_calls=None))]
    mock_pr_completion.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
    mock_pr_client.chat.completions.create.return_value = mock_pr_completion
    
    # Mock do get_openai_client ou do client dentro de pre_router_module (que é instanciado via openai.AsyncOpenAI)
    original_async_openai = pre_router_module.openai.AsyncOpenAI
    pre_router_module.openai.AsyncOpenAI = MagicMock(return_value=mock_pr_client)
    
    try:
        import os
        os.environ["OPENAI_API_KEY"] = "mock-key" # Garante que passa da checagem da API key
        
        pr_result = await run_pre_router_ai("Quero saber mais sobre o Laser Day. Como funciona o curso?", [], config)
        
        # Validamos que detectou o anúncio e removeu
        assert pr_result["eh_anuncio"] is True
        assert pr_result["eh_saudacao"] is False
        assert pr_result["perguntas_extraidas"] == "Como funciona o curso?"
        
        # 2. Agora testamos process_message com a pergunta extraída
        result = await process_message(pr_result["perguntas_extraidas"], [], config)
        
        # Validamos que respondeu à dúvida e anexou a pergunta inicial no final
        assert "O curso é online e vitalício." in result["content"]
        assert config.initial_question_message in result["content"]
        assert result["content"].endswith(config.initial_question_message)
        
    finally:
        pre_router_module.openai.AsyncOpenAI = original_async_openai
        if "OPENAI_API_KEY" in os.environ:
            del os.environ["OPENAI_API_KEY"]

