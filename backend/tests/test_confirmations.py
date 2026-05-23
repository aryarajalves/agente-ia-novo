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
        self.initial_ignore_message = "{}"
        self.context_window = 5
        self.model_settings = "{}"
        self.router_enabled = False
        self.date_awareness = False
        for k, v in kwargs.items():
            setattr(self, k, v)

@pytest.mark.asyncio
async def test_emoji_confirmation_shortcuts():
    config = MockConfig()
    
    # Testar emojis avulsos (sem histórico)
    emojis_to_test = ["👍", "👌", "👍🏻", "❤️"]
    for em in emojis_to_test:
        result = await run_pre_router_ai(em, [], config)
        assert result["eh_saudacao"] is True
        assert result["resposta_direta"] is not None
        assert "Se precisar de mais alguma coisa" in result["resposta_direta"] or "Perfeito!" in result["resposta_direta"]
        
    # Emojis devem ser atalhos mesmo com pergunta no histórico (reações são sempre concluídas)
    history_with_question = [
        {"role": "user", "content": "Quero comprar"},
        {"role": "assistant", "content": "Você prefere Pix ou cartão?"}
    ]
    result = await run_pre_router_ai("👍", history_with_question, config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] is not None

@pytest.mark.asyncio
async def test_confirmation_words_without_question_in_history():
    config = MockConfig()
    
    # Histórico sem pergunta na última mensagem
    history_no_question = [
        {"role": "user", "content": "vou pensar e te aviso"},
        {"role": "assistant", "content": "Tudo bem, fico no aguardo."}
    ]
    
    # Deve interceptar "ok"
    result = await run_pre_router_ai("ok", history_no_question, config)
    assert result["eh_saudacao"] is True
    assert "Combinado!" in result["resposta_direta"]
    
    # Deve interceptar "combinado"
    result = await run_pre_router_ai("combinado", history_no_question, config)
    assert result["eh_saudacao"] is True
    assert "Combinado!" in result["resposta_direta"]
    
    # Deve interceptar "certo"
    result = await run_pre_router_ai("certo", history_no_question, config)
    assert result["eh_saudacao"] is True
    assert "Certo!" in result["resposta_direta"]

@pytest.mark.asyncio
async def test_confirmation_words_with_question_in_history():
    config = MockConfig()
    
    # Histórico com pergunta na última mensagem do assistente
    history_with_question = [
        {"role": "user", "content": "Quero agendar"},
        {"role": "assistant", "content": "Pode ser amanhã às 14h?"}
    ]
    
    # Para palavras de confirmação por texto, quando houve pergunta, NÃO deve interceptar.
    # Como não temos OPENAI_API_KEY mockada aqui, se tentar rodar, vai dar erro de chave ou tentar chamar a API.
    # Vamos mockar o client da OpenAI em pre_router para simular a passagem correta para a LLM.
    import agent_core.logic.pre_router as pre_router_module
    
    mock_pr_client = AsyncMock()
    mock_pr_completion = AsyncMock()
    # Simula a OpenAI identificando que o usuário respondeu à pergunta (eh_saudacao = False)
    mock_pr_completion.choices = [MagicMock(message=MagicMock(content=json.dumps({
        "eh_saudacao": False,
        "eh_agradecimento": False,
        "eh_mensagem_automatica": False,
        "precisa_esclarecimento": False,
        "resposta_direta": None,
        "resposta_esclarecimento": None,
        "id_agente_alvo": 1,
        "perguntas_extraidas": "sim",
        "data_extraida": None
    }), tool_calls=None))]
    mock_pr_completion.usage = MagicMock(prompt_tokens=5, completion_tokens=5)
    mock_pr_client.chat.completions.create.return_value = mock_pr_completion
    
    original_async_openai = pre_router_module.openai.AsyncOpenAI
    pre_router_module.openai.AsyncOpenAI = MagicMock(return_value=mock_pr_client)
    
    try:
        import os
        os.environ["OPENAI_API_KEY"] = "mock-key"
        
        # Testamos "ok" respondendo a uma pergunta. Não deve usar atalho programático, deve ir para a OpenAI.
        result = await run_pre_router_ai("ok", history_with_question, config)
        
        # O mock retornou eh_saudacao = False, validando que o atalho programático foi contornado
        assert result["eh_saudacao"] is False
        assert result["resposta_direta"] is None
        assert mock_pr_client.chat.completions.create.called
        
    finally:
        pre_router_module.openai.AsyncOpenAI = original_async_openai
        if "OPENAI_API_KEY" in os.environ:
            del os.environ["OPENAI_API_KEY"]

@pytest.mark.asyncio
async def test_process_message_with_confirmation_shortcut():
    config = MockConfig()
    
    # Importante: Garantir que process_message utilize o atalho de saudação direto
    # sem precisar chamar a LLM principal.
    # Ao receber "👍", o pre-router deve atuar e process_message deve retornar o resultado diretamente.
    
    import agent_core.core as core_module
    original_get_openai = core_module.get_openai_client
    mock_client = AsyncMock()
    core_module.get_openai_client = MagicMock(return_value=mock_client)
    
    try:
        result = await process_message("👍", [], config)
        
        # A resposta deve vir direto do atalho programático
        assert "Se precisar de mais alguma coisa" in result["content"] or "Perfeito!" in result["content"]
        # E a LLM principal do core.py NÃO deve ter sido acionada
        assert not mock_client.chat.completions.create.called
        
    finally:
        core_module.get_openai_client = original_get_openai

@pytest.mark.asyncio
async def test_negative_emoji_shortcuts():
    config = MockConfig()
    
    # Testar emojis negativos avulsos (sem histórico)
    neg_emojis = ["👎", "🖕", "😡", "😢", "😭", "👎🏽", "🖕🏻"]
    for em in neg_emojis:
        result = await run_pre_router_ai(em, [], config)
        assert result["eh_saudacao"] is True
        assert result["resposta_direta"] == "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?"
        
    # Emojis negativos devem ser atalhos mesmo se houver pergunta no histórico
    history_with_question = [
        {"role": "user", "content": "Quero comprar"},
        {"role": "assistant", "content": "Gostou do preço de R$ 500?"}
    ]
    result = await run_pre_router_ai("👎", history_with_question, config)
    assert result["eh_saudacao"] is True
    assert result["resposta_direta"] == "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?"

@pytest.mark.asyncio
async def test_process_message_with_negative_emoji():
    config = MockConfig()
    
    import agent_core.core as core_module
    original_get_openai = core_module.get_openai_client
    mock_client = AsyncMock()
    core_module.get_openai_client = MagicMock(return_value=mock_client)
    
    try:
        result = await process_message("👎", [], config)
        
        # A resposta deve vir do atalho de emoji negativo
        assert "Puxa, sinto muito!" in result["content"]
        assert "Como posso te ajudar a resolver de uma forma melhor?" in result["content"]
        # A LLM principal não deve ter sido acionada
        assert not mock_client.chat.completions.create.called
        
    finally:
        core_module.get_openai_client = original_get_openai

