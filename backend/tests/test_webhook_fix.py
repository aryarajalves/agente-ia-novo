
import os
import json
import pytest
import httpx
from fastapi.testclient import TestClient
from httpx import Response
from respx import MockRouter
from datetime import datetime

import sys
sys.path.append('backend') if os.path.isdir('backend') else sys.path.append('.')

from main import app
from database import async_session
from models import WebhookConfigModel, WebhookEventModel
from sqlalchemy import select

# Set the event loop policy for asyncio
@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_receive_webhook_saves_ignored_outgoing():
    """Verifica que mensagens de saída (outgoing) são salvas no banco com status 'ignored'."""
    async with async_session() as session:
        token = "test-token-ignored-" + datetime.utcnow().strftime("%Y%m%d%H%M%S")
        config = WebhookConfigModel(
            name="Teste Ignored",
            token=token,
            leads_table="leads",
            is_active=True
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
        config_id = config.id

    # Usando TestClient síncrono que funciona bem com o roteador async do FastAPI
    client = TestClient(app)
    # Payload de mensagem de saída (agente respondendo)
    payload = {
        "event": "message_created",
        "content": "Resposta do Agente",
        "message_type": "outgoing",
        "conversation": {"id": 123, "account_id": 1},
        "sender": {"id": 1, "name": "Agente"},
        "account": {"id": 1}
    }

    response = client.post(f"/webhooks/receive/{token}", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"

    # Verificar se foi salvo no banco de eventos
    async with async_session() as session:
        result = await session.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config_id))
        event = result.scalar_one_or_none()
        assert event is not None
        assert event.status == "ignored"
        assert "outgoing message" in event.processing_steps

@pytest.mark.anyio
async def test_get_chatwoot_labels_fallback_logic(monkeypatch, respx_mock: MockRouter):
    """Verifica que o fallback de account_id via API funciona quando o DB está vazio."""
    cw_url = "https://cw.test"
    cw_token = "cw-token"
    monkeypatch.setenv("CHATWOOT_URL", cw_url)
    monkeypatch.setenv("CHATWOOT_API_TOKEN", cw_token)

    async with async_session() as session:
        token = "test-token-labels-" + datetime.utcnow().strftime("%Y%m%d%H%M%S")
        config = WebhookConfigModel(
            name="Teste Labels",
            token=token,
            leads_table="leads",
            is_active=True
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
        webhook_id = config.id

    # Mock das chamadas do Chatwoot
    respx_mock.get(f"{cw_url}/api/v1/accounts").mock(return_value=Response(200, json=[{"id": 10, "name": "Conta Teste"}]))
    respx_mock.get(f"{cw_url}/api/v1/accounts/10/labels").mock(return_value=Response(200, json={"payload": [{"title": "Label1"}, {"title": "Label2"}]}))

    client = TestClient(app)
    response = client.get(f"/webhooks/{webhook_id}/chatwoot-labels")
    
    assert response.status_code == 200
    data = response.json()
    assert "Label1" in data["labels"]
    assert "Label2" in data["labels"]
