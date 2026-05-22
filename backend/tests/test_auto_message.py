import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from agent_core.logic.pre_router import run_pre_router_ai
from webhook_services import retrieve_context_history
from models import AgentConfigModel, WebhookEventModel

@pytest.mark.asyncio
async def test_pre_router_detects_automatic_message():
    # Setup mocks
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Main"
    main_agent.description = "Principal"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = "Olá! Seja bem-vindo à nossa empresa."
    main_agent.initial_ignore_message = None
    
    # Mock da resposta do LLM contendo eh_mensagem_automatica = True
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": true, "eh_agradecimento": false, "eh_mensagem_automatica": true, '
        '"precisa_esclarecimento": false, "resposta_direta": null, "resposta_esclarecimento": null, '
        '"id_agente_alvo": 1, "perguntas_extraidas": null, "data_extraida": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 15
    
    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai(
                "Olá! Obrigado por entrar em contato. No momento não estamos disponíveis...",
                [],
                main_agent,
                []
            )
            
            assert result["eh_mensagem_automatica"] is True
            assert result["eh_saudacao"] is True
            # Deve retornar a saudação configurada do agente
            assert result["resposta_direta"] == "Olá! Seja bem-vindo à nossa empresa."

@pytest.mark.asyncio
async def test_pre_router_automatic_message_fallback():
    # Setup mocks sem initial_message configurada (fallback deve ser usado)
    main_agent = MagicMock(spec=AgentConfigModel)
    main_agent.id = 1
    main_agent.name = "Main"
    main_agent.description = "Principal"
    main_agent.router_simple_model = "gpt-4o-mini"
    main_agent.initial_message = None  # Sem saudação
    main_agent.initial_ignore_message = None
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = (
        '{"eh_saudacao": true, "eh_agradecimento": false, "eh_mensagem_automatica": true, '
        '"precisa_esclarecimento": false, "resposta_direta": null, "resposta_esclarecimento": null, '
        '"id_agente_alvo": 1, "perguntas_extraidas": null, "data_extraida": null}'
    )
    mock_response.usage = MagicMock()
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_tokens = 15
    
    with patch("os.getenv", return_value="fake-key"):
        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await run_pre_router_ai(
                "Catálogo de Serviços da Clinica...",
                [],
                main_agent,
                []
            )
            
            assert result["eh_mensagem_automatica"] is True
            # Deve usar o fallback padrão do sistema
            assert result["resposta_direta"] == "Olá! Como posso te ajudar hoje?"

@patch("webhook_tasks._add_step")
def test_retrieve_context_history_ignores_automatic_messages(mock_add_step):
    # Mock do DB e Queries do SQLAlchemy
    db_mock = MagicMock()
    
    # Criamos eventos passados de teste: um automático e um normal
    event_normal = MagicMock(spec=WebhookEventModel)
    event_normal.id = 10
    event_normal.mensagem = "Quero saber o preço"
    event_normal.agent_response = "Custa R$ 100"
    event_normal.dono = "agente"
    event_normal.is_automatic = False
    
    event_automatic = MagicMock(spec=WebhookEventModel)
    event_automatic.id = 11
    event_automatic.mensagem = "Olá, seja bem-vindo ao Jessica Beauty"
    event_automatic.agent_response = "Olá! Como posso ajudar?"
    event_automatic.dono = "agente"
    event_automatic.is_automatic = True
    
    # Configurar o mock de query para retornar apenas o evento normal
    query_mock = MagicMock()
    db_mock.query.return_value = query_mock
    filter_mock = MagicMock()
    query_mock.filter.return_value = filter_mock
    order_mock = MagicMock()
    filter_mock.order_by.return_value = order_mock
    limit_mock = MagicMock()
    order_mock.limit.return_value = limit_mock
    
    # O mock deve retornar apenas a mensagem normal no all()
    limit_mock.all.return_value = [event_normal]
    
    event = MagicMock(spec=WebhookEventModel)
    event.webhook_config_id = 1
    
    db_agent = MagicMock(spec=AgentConfigModel)
    db_agent.context_window = 5
    
    # Chamamos o service
    history = retrieve_context_history(
        db=db_mock,
        event=event,
        db_agent=db_agent,
        raw_phone="123456789",
        clean_phone="123456789",
        event_id=12
    )
    
    # Deve conter a mensagem normal e não conter a automática
    assert len(history) == 2  # (user: Quero saber o preço, assistant: Custa R$ 100)
    assert history[0]["content"] == "Quero saber o preço"
    assert history[1]["content"] == "Custa R$ 100"
    
    # Verificar se a mensagem automática foi excluída do histórico
    for msg in history:
        assert "Jessica Beauty" not in msg["content"]
