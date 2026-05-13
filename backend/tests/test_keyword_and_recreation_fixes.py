import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy import text
from webhook_router import _upsert_lead, receive_webhook, WebhookConfigModel

@pytest.mark.asyncio
async def test_upsert_lead_sql_fix(db_session):
    """Verifica se o _upsert_lead não falha com o erro de SQL anterior."""
    table_name = "leads_test_fix"
    # Criar tabela de teste
    await db_session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            telefone VARCHAR,
            ultima_resposta_agente TEXT,
            ultima_resposta_agente_em TIMESTAMP,
            updated_at TIMESTAMP,
            conta_id VARCHAR, inbox_id VARCHAR, inbox_nome VARCHAR, 
            conversa_id VARCHAR, mensagem_id VARCHAR, contato_id VARCHAR, 
            labels TEXT, contato_nome VARCHAR, link TEXT
        )
    """))
    await db_session.commit()

    data = {
        "telefone": "123456789",
        "mensagem": "Olá",
        "dono": "agente",
        "conta_id": "1", "inbox_id": "1", "inbox_nome": "Test",
        "conversa_id": "1", "mensagem_id": "1", "contato_id": "1",
        "labels": "", "contato_nome": "Test User", "link": None
    }
    
    # 1. Primeiro insere um lead para que o UPDATE seja chamado no próximo upsert
    await db_session.execute(text(f"INSERT INTO {table_name} (webhook_config_id, telefone, ultima_resposta_agente_em) VALUES (1, '123456789', :now)"), {"now": datetime.utcnow()})
    await db_session.commit()

    # 2. Chamar _upsert_lead (deve executar o UPDATE com a nova lógica de threshold)
    # Não deve lançar exceção
    await _upsert_lead(table_name, data, 1)

@pytest.mark.asyncio
async def test_agent_message_no_recreate_lead(db_session):
    """Verifica se mensagens de agente não recriam leads deletados."""
    table_name = "leads_test_recreate"
    await db_session.execute(text(f"CREATE TABLE IF NOT EXISTS {table_name} (id SERIAL PRIMARY KEY, telefone VARCHAR, webhook_config_id INTEGER)"))
    await db_session.commit()

    data = {
        "telefone": "999999999",
        "dono": "agente",
        "mensagem": "Despedida"
    }

    # Se o lead não existe e é agente, _upsert_lead deve retornar sem fazer nada
    await _upsert_lead(table_name, data, 1)
    
    res = await db_session.execute(text(f"SELECT COUNT(*) FROM {table_name} WHERE telefone = '999999999'"))
    assert res.scalar() == 0

@pytest.mark.asyncio
async def test_handoff_keyword_in_aggregated_bubbles():
    """Verifica se o handoff funciona mesmo em mensagens de saída que seriam agregadas."""
    mock_db = AsyncMock()
    mock_config = MagicMock()
    mock_config.id = 1
    mock_config.token = "test_token"
    mock_config.is_active = True
    mock_config.handoff_keyword = "#humano"
    mock_config.handoff_labels_to_add = '["humano"]'
    mock_config.handoff_labels_to_remove = '["robo"]'
    mock_config.delete_message = "Adeus"
    mock_config.leads_table = "leads"

    payload = {
        "event": "message_created",
        "message_type": "outgoing",
        "content": "#humano",
        "conversation": {"id": 1, "account_id": 1},
        "sender": {"phone_number": "12345"},
        "account": {"id": 1}
    }

    mock_request = MagicMock()
    mock_request.json = AsyncMock(return_value=payload)

    with patch("webhook_router.engine.begin") as mock_begin, \
         patch("webhook_router._handle_keyword_handoffs", new_callable=AsyncMock) as mock_handoff:
        
        mock_handoff.return_value = True # Simula que o handoff foi processado
        
        from webhook_router import receive_webhook
        response = await receive_webhook("test_token", mock_request, mock_db)
        
        assert response["reason"] == "outgoing handoff triggered"
        assert mock_handoff.called

@pytest.mark.asyncio
async def test_farewell_message_ignored():
    """Verifica se a mensagem de despedida configurada é ignorada nos logs (evita loops)."""
    mock_db = AsyncMock()
    mock_config = MagicMock()
    mock_config.id = 1
    mock_config.token = "test_token"
    mock_config.is_active = True
    mock_config.delete_message = "Seus dados foram resetados."
    mock_config.leads_table = "leads"

    payload = {
        "event": "message_created",
        "message_type": "outgoing",
        "content": "Seus dados foram resetados.",
        "conversation": {"id": 1, "account_id": 1},
        "sender": {"phone_number": "12345"},
        "account": {"id": 1}
    }

    mock_request = MagicMock()
    mock_request.json = AsyncMock(return_value=payload)

    with patch("webhook_router.engine.begin"), \
         patch("webhook_router._handle_keyword_handoffs", return_value=False):
        
        from webhook_router import receive_webhook
        response = await receive_webhook("test_token", mock_request, mock_db)
        
        assert response["status"] == "ignored"
        assert response["reason"] == "farewell message ignored"
