
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, AgentConfigModel, WebhookEventModel
from webhook_router import receive_webhook, receive_memory_webhook
from fastapi import Request
from sqlalchemy import text
import json

@pytest.mark.asyncio
async def test_bubble_filter_outgoing_webhook(db_session: AsyncSession):
    # Setup agent and config
    agent = AgentConfigModel(name="Bubble Agent", model="gpt-4o-mini")
    db_session.add(agent)
    await db_session.flush()

    config = WebhookConfigModel(
        name="Bubble Webhook",
        token="bubble_token",
        leads_table="leads_test_bubble", 
        agent_id=agent.id,
        is_active=True
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Test outgoing fragment (bubble)
    phone = "5511988887777"
    full_response = "Olá! Como posso ajudar você hoje? Eu sou um assistente virtual."
    bubble_content = "Olá! Como posso ajudar você hoje?" # Substring
    
    payload = {
        "event": "message_created",
        "message_type": "outgoing",
        "content": bubble_content,
        "sender": {"type": "user", "id": 100}, 
        "conversation": {"id": "conv_123", "account_id": "1"},
        "id": "msg_bubble_1",
        "account": {"id": "1"},
        "inbox": {"id": "1", "name": "WhatsApp"}
    }

    mock_request = MagicMock(spec=Request)
    async def mock_json(): return payload
    mock_request.json = mock_json

    # Mock DB result for the bubble filter query
    mock_row = MagicMock()
    mock_row.ultima_resposta_agente = full_response
    mock_row.ultima_resposta_agente_em = datetime.utcnow()
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row

    # Mock dependencies
    with patch('webhook_router._is_bot_user', return_value=True), \
         patch('webhook_router._handle_keyword_handoffs', return_value=False), \
         patch('webhook_router._redis') as mock_redis, \
         patch('webhook_router._ensure_leads_table', return_value=None), \
         patch('webhook_router._upsert_lead', return_value=None), \
         patch.object(db_session, 'execute', return_value=mock_result):
        
        mock_redis.get.return_value = None
        
        response = await receive_webhook(config.token, mock_request, db_session)
        assert response.get("status") == "ignored"
        assert response.get("reason") == "fragmented bubble ignored (no event created)"

@pytest.mark.asyncio
async def test_bubble_filter_late_fragment_still_ignored(db_session: AsyncSession):
    """Testa que fragmentos que chegam entre 15-120s depois ainda são bloqueados corretamente.
    Bug original: o filtro anterior usava janela de 15s no DB, mas o fragmento chegava após 18s."""
    agent = AgentConfigModel(name="Late Bubble Agent", model="gpt-4o-mini")
    db_session.add(agent)
    await db_session.flush()

    config = WebhookConfigModel(
        name="Late Bubble Webhook",
        token="late_bubble_token",
        leads_table="leads_test_late_bubble", 
        agent_id=agent.id,
        is_active=True
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    phone = "5511988887788"
    full_response = "Olá! Aqui é a Lira, da Fonte Oculta. Como posso te ajudar? Me conta só uma coisa: o que te fez chegar até a gente hoje?"
    # Fragmento final da mensagem (como aparecia no bug)
    bubble_content = "Me conta só uma coisa: o que te fez chegar até a gente hoje?"
    
    payload = {
        "event": "message_created",
        "message_type": "outgoing",
        "content": bubble_content,
        "sender": {"type": "user", "id": 101}, 
        "conversation": {"id": "conv_124", "account_id": "1"},
        "id": "msg_late_1",
        "account": {"id": "1"},
        "inbox": {"id": "1", "name": "WhatsApp"}
    }

    mock_request = MagicMock(spec=Request)
    async def mock_json(): return payload
    mock_request.json = mock_json

    # Simula que a resposta completa foi salva HÁ 18 SEGUNDOS (era o que fazia o bug falhar com janela de 15s)
    mock_row = MagicMock()
    mock_row.ultima_resposta_agente = full_response
    mock_row.ultima_resposta_agente_em = datetime.utcnow() - timedelta(seconds=18)
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row

    with patch('webhook_router._is_bot_user', return_value=True), \
         patch('webhook_router._handle_keyword_handoffs', return_value=False), \
         patch('webhook_router._redis') as mock_redis, \
         patch('webhook_router._ensure_leads_table', return_value=None), \
         patch('webhook_router._upsert_lead', return_value=None), \
         patch.object(db_session, 'execute', return_value=mock_result):
        
        mock_redis.get.return_value = None
        
        response = await receive_webhook(config.token, mock_request, db_session)
        # Com a correção, fragmentos com até 120s devem ser ignorados
        assert response.get("status") == "ignored", f"Esperado 'ignored' mas recebeu: {response}"
        assert response.get("reason") == "fragmented bubble ignored (no event created)"

@pytest.mark.asyncio
async def test_bubble_filter_memory_webhook(db_session: AsyncSession):
    # Setup agent and config
    agent = AgentConfigModel(name="Mem Bubble Agent", model="gpt-4o-mini")
    db_session.add(agent)
    await db_session.flush()

    config = WebhookConfigModel(
        name="Mem Bubble Webhook",
        token="mem_bubble_token",
        memory_token="mem_token_abc",
        leads_table="leads_test_mem_bubble",
        agent_id=agent.id,
        is_active=True,
        memory_sync_enabled=True,
        memory_phone_path="contact_phone"
    )
    db_session.add(config)
    await db_session.commit()

    phone = "5511977776666"
    full_response = "Sua fatura está disponível no portal. Deseja o boleto?"
    
    # Test memory sync with fragment
    payload = {
        "contact_phone": phone,
        "template_content": "Sua fatura está disponível no portal." # Substring
    }

    mock_request = MagicMock(spec=Request)
    async def mock_json(): return payload
    mock_request.json = mock_json

    # Mock DB result for the bubble filter query
    mock_row = MagicMock()
    mock_row.ultima_resposta_agente = full_response
    mock_row.ultima_resposta_agente_em = datetime.utcnow()
    
    mock_result = MagicMock()
    mock_result.fetchone.return_value = mock_row

    with patch('webhook_router._ensure_leads_table', return_value=None), \
         patch.object(db_session, 'execute', return_value=mock_result):
        response = await receive_memory_webhook(config.memory_token, mock_request, db_session)
        assert response.get("status") == "ignored"
        assert response.get("reason") == "fragmented memory bubble ignored"
