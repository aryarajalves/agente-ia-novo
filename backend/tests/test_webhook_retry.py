import pytest
from unittest.mock import patch
from sqlalchemy import text
from datetime import datetime
from models import WebhookConfigModel, WebhookEventModel

async def create_test_webhook(session, name="Retry Webhook", leads_table="test_retry_leads"):
    config = WebhookConfigModel(
        name=name,
        token=f"token_retry_{datetime.utcnow().timestamp()}",
        leads_table=leads_table,
        is_active=True
    )
    session.add(config)
    await session.commit()
    await session.refresh(config)
    
    await session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {leads_table} (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            telefone VARCHAR,
            contato_nome VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            pode_enviar_mensagem BOOLEAN DEFAULT TRUE,
            ultima_mensagem_em TIMESTAMP
        )
    """))
    await session.execute(text(f"DELETE FROM {leads_table}"))
    await session.commit()
    return config

@pytest.mark.asyncio
async def test_retry_webhook_event_success(client, db_session):
    config = await create_test_webhook(db_session)
    
    event = WebhookEventModel(
        webhook_config_id=config.id,
        event_type="message",
        telefone="558599990000",
        contato_nome="Test Retry User",
        status="completed",
        mensagem="Olá agente!",
        agent_response="Olá usuário, como posso ajudar?",
        processing_steps='[{"step": "Initial", "detail": "Test detail"}]'
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    
    # Mockar a task do Celery
    with patch("webhook_tasks.process_webhook_automation.delay") as mock_celery_delay:
        response = await client.post(f"/webhooks/{config.id}/events/{event.id}/retry")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["status"] == "processing"
        
        # Validar que a task Celery foi chamada com o ID correto
        mock_celery_delay.assert_called_once_with(event.id)
        
    # Verificar se o status e steps do evento foram resetados no banco
    await db_session.refresh(event)
    assert event.status == "processing"
    assert event.agent_response is None
    
    # Verificar passos gravados
    import json
    steps = json.loads(event.processing_steps)
    assert len(steps) == 1
    assert steps[0]["step"] == "🔄 Reiniciando Pipeline"

@pytest.mark.asyncio
async def test_retry_webhook_event_concurrency_error(client, db_session):
    config = await create_test_webhook(db_session)
    
    event = WebhookEventModel(
        webhook_config_id=config.id,
        event_type="message",
        telefone="558599990000",
        contato_nome="Test Retry User",
        status="processing",
        mensagem="Olá agente!",
        agent_response=None,
        processing_steps='[]'
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)
    
    # Mockar a task do Celery
    with patch("webhook_tasks.process_webhook_automation.delay") as mock_celery_delay:
        response = await client.post(f"/webhooks/{config.id}/events/{event.id}/retry")
        assert response.status_code == 400
        data = response.json()
        assert "já está sendo processado" in data["detail"]
        mock_celery_delay.assert_not_called()

@pytest.mark.asyncio
async def test_retry_webhook_event_not_found(client, db_session):
    config = await create_test_webhook(db_session)
    
    # Chamar para um event_id inexistente
    response = await client.post(f"/webhooks/{config.id}/events/99999/retry")
    assert response.status_code == 404
    data = response.json()
    assert "não encontrado" in data["detail"]
