import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import httpx
import json
from datetime import datetime, timezone

from chatwoot_utils import get_conversation_labels_sync
from webhook_tasks import process_webhook_automation

def test_get_conversation_labels_sync_success():
    """Valida retorno correto ao obter etiquetas do Chatwoot com sucesso."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"payload": ["lead-quente", "conversao"]}
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = mock_response
        
        labels = get_conversation_labels_sync(
            cw_url="http://chatwoot-teste.com",
            account_id=1,
            conversation_id=123,
            token="test-token"
        )
        
        assert labels == ["lead-quente", "conversao"]
        mock_get.assert_called_once_with(
            "http://chatwoot-teste.com/api/v1/accounts/1/conversations/123/labels",
            headers={"api_access_token": "test-token"}
        )

def test_get_conversation_labels_sync_empty():
    """Valida retorno de lista vazia se a conversa não tiver etiquetas."""
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"payload": []}
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = mock_response
        
        labels = get_conversation_labels_sync(
            cw_url="http://chatwoot-teste.com",
            account_id=1,
            conversation_id=123,
            token="test-token"
        )
        
        assert labels == []

def test_get_conversation_labels_sync_http_error():
    """Valida que retorna None se a API retornar erro HTTP (ex: 404, 500)."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    
    with patch("httpx.Client.get") as mock_get:
        mock_get.return_value = mock_response
        
        labels = get_conversation_labels_sync(
            cw_url="http://chatwoot-teste.com",
            account_id=1,
            conversation_id=123,
            token="test-token"
        )
        
        assert labels is None

def test_get_conversation_labels_sync_exception():
    """Valida que retorna None em caso de exceção de rede."""
    with patch("httpx.Client.get") as mock_get:
        mock_get.side_effect = httpx.RequestError("Erro de Conexão")
        
        labels = get_conversation_labels_sync(
            cw_url="http://chatwoot-teste.com",
            account_id=1,
            conversation_id=123,
            token="test-token"
        )
        
        assert labels is None

def test_get_conversation_labels_sync_invalid_params():
    """Valida que retorna None se os parâmetros forem vazios/inválidos."""
    labels = get_conversation_labels_sync("", 0, 0, "")
    assert labels is None

def test_process_webhook_automation_updates_lead_with_labels():
    """
    Testa se a task process_webhook_automation atualiza a tabela de leads
    incluindo as etiquetas obtidas do Chatwoot.
    """
    with patch("webhook_tasks.SessionLocal") as mock_session_local, \
         patch("webhook_tasks._add_step") as mock_add_step, \
         patch("webhook_tasks._build_agent_config") as mock_build_config, \
         patch("webhook_tasks.retrieve_context_history") as mock_retrieve_history, \
         patch("webhook_tasks.run_pre_router_ai", new_callable=AsyncMock) as mock_run_pre_router, \
         patch("webhook_tasks.process_message", new_callable=AsyncMock) as mock_process_message, \
         patch("webhook_tasks._send_chatwoot_message") as mock_send_message, \
         patch("webhook_tasks.is_conversation_paused", new_callable=AsyncMock, return_value=False), \
         patch("webhook_tasks.sync_conversation_labels", new_callable=AsyncMock, return_value=(True, [])), \
         patch("redis.from_url") as mock_redis_from_url, \
         patch("chatwoot_utils.get_conversation_labels_sync") as mock_get_labels:
        
        # Mock do DB
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        mock_db.execute.return_value.fetchone.return_value = (42, datetime.now(timezone.utc), datetime.now(timezone.utc))
        
        # Evento de webhook
        mock_event = MagicMock()
        mock_event.id = 42
        mock_event.status = "pending"
        mock_event.telefone = "5511999999999"
        mock_event.mensagem = "Olá"
        mock_event.legenda = None
        mock_event.message_type = "text"
        mock_event.link = None
        mock_event.webhook_config_id = 2
        mock_event.conversa_id = "123"
        mock_event.conta_id = "1"
        mock_event.contato_nome = "Cliente Teste"
        
        # Config do webhook
        mock_config = MagicMock()
        mock_config.id = 2
        mock_config.agent_id = 99
        mock_config.leads_table = "webhook_leads_test"
        mock_config.delete_keywords = None
        mock_config.response_delay_seconds = 0
        mock_config.delete_labels = None
        mock_config.ignore_by_label = "humano"
        mock_config.labels_on_message = None
        mock_config.chatwoot_url = "http://chatwoot.local"
        mock_config.chatwoot_api_token = "cw-api-token"
        mock_config.secondary_agent_ids = None
        
        # Agente
        mock_agent = MagicMock()
        mock_agent.id = 99
        mock_agent.name = "Agente de Teste"
        mock_agent.model = "gpt-4o-mini"
        mock_agent.system_prompt = "Prompt do Agente"
        mock_agent.tools = []
        mock_agent.security_bot_protection = False
        mock_agent.context_window = 1000
        
        # Configurar retorno do banco de dados para query.filter.first
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_event,  # primeira chamada busca o evento
            mock_config, # segunda chamada busca a config
            mock_agent   # terceira chamada busca o agente
        ]
        
        # Mocks de retornos
        mock_retrieve_history.return_value = []
        mock_run_pre_router.return_value = {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "resposta_direta": None,
            "perguntas_extraidas": "Olá",
            "data_extraida": None,
            "eh_anuncio": False,
            "detalhe_anuncio": None,
            "_model_used": "gpt-4o-mini",
            "_usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120}
        }
        mock_process_message.return_value = {
            "content": "Olá! Como posso ajudar?",
            "model": "gpt-4o-mini",
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            "debug": {"resolved_prompt": "Prompt do Agente", "tool_calls": []}
        }
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        
        # Mock para as labels retornadas do Chatwoot
        mock_get_labels.return_value = ["novo-lead", "importante"]
        
        # Executa a task de forma síncrona
        process_webhook_automation.run(42)
        
        # Verifica se buscou as labels com os parâmetros corretos
        mock_get_labels.assert_called_once_with(
            "http://chatwoot.local",
            1,
            123,
            "cw-api-token"
        )
        
        # Captura as queries executadas no db.execute
        db_execute_calls = mock_db.execute.call_args_list
        update_lead_query_call = None
        for call in db_execute_calls:
            query_str = str(call[0][0])
            if "UPDATE" in query_str and "webhook_leads_test" in query_str and "ultima_resposta_agente" in query_str:
                update_lead_query_call = call
                break
                
        assert update_lead_query_call is not None, "Query de atualização de leads não encontrada!"
        
        # Verifica se o parâmetro 'labels' e os outros dados foram passados
        params = update_lead_query_call[0][1] if len(update_lead_query_call[0]) > 1 else update_lead_query_call[1]
        assert "labels" in params
        assert json.loads(params["labels"]) == ["novo-lead", "importante"]
        assert params["nome"] == "Cliente Teste"
        assert params["tel"] == "5511999999999"
        
        # Verifica se a query de atualização do SQL contém a coluna labels
        query_text = str(update_lead_query_call[0][0])
        assert "labels = :labels" in query_text

def test_process_webhook_automation_preserves_labels_on_error():
    """
    Testa se a task process_webhook_automation preserva as etiquetas anteriores
    (não insere 'labels' na query de UPDATE) caso o Chatwoot retorne erro (None).
    """
    with patch("webhook_tasks.SessionLocal") as mock_session_local, \
         patch("webhook_tasks._add_step") as mock_add_step, \
         patch("webhook_tasks._build_agent_config") as mock_build_config, \
         patch("webhook_tasks.retrieve_context_history") as mock_retrieve_history, \
         patch("webhook_tasks.run_pre_router_ai", new_callable=AsyncMock) as mock_run_pre_router, \
         patch("webhook_tasks.process_message", new_callable=AsyncMock) as mock_process_message, \
         patch("webhook_tasks._send_chatwoot_message") as mock_send_message, \
         patch("webhook_tasks.is_conversation_paused", new_callable=AsyncMock, return_value=False), \
         patch("webhook_tasks.sync_conversation_labels", new_callable=AsyncMock, return_value=(True, [])), \
         patch("redis.from_url") as mock_redis_from_url, \
         patch("chatwoot_utils.get_conversation_labels_sync") as mock_get_labels:
        
        # Mock do DB
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        mock_db.execute.return_value.fetchone.return_value = (42, datetime.now(timezone.utc), datetime.now(timezone.utc))
        
        # Evento de webhook
        mock_event = MagicMock()
        mock_event.id = 42
        mock_event.status = "pending"
        mock_event.telefone = "5511999999999"
        mock_event.mensagem = "Olá"
        mock_event.legenda = None
        mock_event.message_type = "text"
        mock_event.link = None
        mock_event.webhook_config_id = 2
        mock_event.conversa_id = "123"
        mock_event.conta_id = "1"
        mock_event.contato_nome = "Cliente Teste"
        
        # Config do webhook
        mock_config = MagicMock()
        mock_config.id = 2
        mock_config.agent_id = 99
        mock_config.leads_table = "webhook_leads_test"
        mock_config.delete_keywords = None
        mock_config.response_delay_seconds = 0
        mock_config.delete_labels = None
        mock_config.ignore_by_label = "humano"
        mock_config.labels_on_message = None
        mock_config.chatwoot_url = "http://chatwoot.local"
        mock_config.chatwoot_api_token = "cw-api-token"
        mock_config.secondary_agent_ids = None
        
        # Agente
        mock_agent = MagicMock()
        mock_agent.id = 99
        mock_agent.name = "Agente de Teste"
        mock_agent.model = "gpt-4o-mini"
        mock_agent.system_prompt = "Prompt do Agente"
        mock_agent.tools = []
        mock_agent.security_bot_protection = False
        mock_agent.context_window = 1000
        
        # Configurar retorno do banco de dados para query.filter.first
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_event,
            mock_config,
            mock_agent
        ]
        
        # Mocks de retornos
        mock_retrieve_history.return_value = []
        mock_run_pre_router.return_value = {
            "eh_saudacao": False,
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "resposta_direta": None,
            "perguntas_extraidas": "Olá",
            "data_extraida": None,
            "eh_anuncio": False,
            "detalhe_anuncio": None,
            "_model_used": "gpt-4o-mini",
            "_usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120}
        }
        mock_process_message.return_value = {
            "content": "Olá! Como posso ajudar?",
            "model": "gpt-4o-mini",
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            "debug": {"resolved_prompt": "Prompt do Agente", "tool_calls": []}
        }
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        
        # Simula falha na chamada ao Chatwoot (retorno None)
        mock_get_labels.return_value = None
        
        # Executa a task
        process_webhook_automation.run(42)
        
        # Busca a chamada do UPDATE
        db_execute_calls = mock_db.execute.call_args_list
        update_lead_query_call = None
        for call in db_execute_calls:
            query_str = str(call[0][0])
            if "UPDATE" in query_str and "webhook_leads_test" in query_str and "ultima_resposta_agente" in query_str:
                update_lead_query_call = call
                break
                
        assert update_lead_query_call is not None, "Query de atualização de leads não encontrada!"
        
        # Verifica se 'labels' NÃO foi atualizado (não deve estar nos parâmetros)
        params = update_lead_query_call[0][1] if len(update_lead_query_call[0]) > 1 else update_lead_query_call[1]
        assert "labels" not in params
        
        query_text = str(update_lead_query_call[0][0])
        assert "labels = :labels" not in query_text
