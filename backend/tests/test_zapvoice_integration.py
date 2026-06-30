import json
import pytest
from unittest.mock import MagicMock, patch
from models import WebhookConfigModel, WebhookEventModel
from database import engine as global_engine

@pytest.mark.asyncio
async def test_zapvoice_webhook_reception(client, db_session, monkeypatch):
    try:
        await global_engine.dispose()
    except TypeError:
        global_engine.dispose()

    # Configurar API Key
    monkeypatch.setenv("AGENT_API_KEY", "test-secret-key")
    headers = {"X-API-Key": "test-secret-key"}

    # Criar configuração do webhook
    config = WebhookConfigModel(
        name="ZapVoice Webhook Test",
        token="zapvoice-token",
        leads_table="leads",
        is_active=True,
        zapvoice_url="https://api.zapvoice.com",
        zapvoice_api_token="zv-api-token",
        zapvoice_client_id="client_123"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    # Payload simulado do ZapVoice
    zapvoice_payload = {
        "event": "message.created",
        "client_id": "client_123",
        "message": {
            "id": "msg_98765",
            "content": "Olá, quero suporte!",
            "message_type": "text",
            "sender_type": "contact",
            "conversation_id": "convo_456",
            "media_url": None
        },
        "contact": {
            "name": "João Teste",
            "phone": "5511999999999",
            "labels": ["suporte", "quente"]
        }
    }

    # Enviar POST para o endpoint do webhook
    response = await client.post(
        f"/webhooks/receive/zapvoice-token",
        json=zapvoice_payload
    )

    assert response.status_code == 200
    res_data = response.json()
    assert res_data.get("ok") is True

    # Verificar se o evento foi salvo no banco de dados
    from sqlalchemy import select
    stmt = select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id)
    event_res = await db_session.execute(stmt)
    event = event_res.scalar_one_or_none()

    assert event is not None
    assert event.mensagem == "Olá, quero suporte!"
    assert event.telefone == "5511999999999"
    assert event.conversa_id == "convo_456"
    assert event.conta_id == "client_123"
