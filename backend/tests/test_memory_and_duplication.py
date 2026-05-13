
import pytest
import uuid
import os
from unittest.mock import MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel, AgentConfigModel
from webhook_router import receive_webhook
from fastapi import Request
import json

@pytest.mark.asyncio
async def test_duplicate_message_prevention(db_session: AsyncSession):
    # 1. Configurar Agente
    agent = AgentConfigModel(name="Test Agent", model="gpt-4o-mini")
    db_session.add(agent)
    await db_session.flush()

    # 2. Configurar Webhook
    config = WebhookConfigModel()
    config.name = "Test Webhook Dup"
    config.token = f"token_{uuid.uuid4()}"
    config.leads_table = "leads_test"
    config.agent_id = agent.id
    config.is_active = True
    
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Mock do Payload do Chatwoot
    msg_id = f"msg_{uuid.uuid4()}"
    payload = {
        "id": msg_id,
        "content": "oie",
        "conversation": {"id": "1", "account_id": "1", "labels": []},
        "sender": {"phone_number": "5511999999999", "name": "Tester"},
        "account": {"id": "1"},
        "inbox": {"channel_type": "whatsapp"}
    }

    # 3. Executar Teste com Mocks
    with patch('webhook_router.process_webhook_automation.apply_async') as mock_celery, \
         patch('webhook_router._redis') as mock_redis:
        
        mock_redis.get.return_value = None
        mock_task = MagicMock()
        mock_task.id = "fake_task_id"
        mock_celery.return_value = mock_task

        # Mock da Request do FastAPI
        mock_request = MagicMock(spec=Request)
        async def mock_json(): return payload
        mock_request.json = mock_json

        # Primeira Chamada
        response = await receive_webhook(config.token, mock_request, db_session)
        assert response.get("ok") is True
        
        # Segunda Chamada
        mock_request2 = MagicMock(spec=Request)
        async def mock_json2(): return payload
        mock_request2.json = mock_json2
        
        response2 = await receive_webhook(config.token, mock_request2, db_session)
        assert response2.get("status") == "duplicate_ignored"

@pytest.mark.asyncio
async def test_memory_retrieval_with_processed_status(db_session: AsyncSession):
    # 1. Configurar Agente
    agent = AgentConfigModel(name="Context Agent", model="gpt-4o-mini", context_window=5)
    db_session.add(agent)
    await db_session.flush()

    config = WebhookConfigModel()
    config.name = "Test Webhook Mem"
    config.token = f"token_{uuid.uuid4()}"
    config.leads_table = "leads_test"
    config.agent_id = agent.id
    config.is_active = True
    db_session.add(config)
    await db_session.commit()

    # 2. Criar um evento anterior com status 'processed'
    past_event = WebhookEventModel(
        webhook_config_id=config.id,
        telefone="5511888888888",
        mensagem="Pergunta anterior",
        agent_response="Resposta anterior",
        status="processed",
        mensagem_id=f"msg_{uuid.uuid4()}"
    )
    db_session.add(past_event)
    await db_session.commit()

    # 3. Testar o filtro do banco direto
    from sqlalchemy import select
    search_phones = ["5511888888888", "+5511888888888"]
    past_events_query = select(WebhookEventModel).where(
        WebhookEventModel.telefone.in_(search_phones),
        WebhookEventModel.status.in_(["completed", "processed"])
    )
    
    res = await db_session.execute(past_events_query)
    found_events = res.scalars().all()
    
    assert len(found_events) >= 1
    assert any(e.mensagem == "Pergunta anterior" for e in found_events)
