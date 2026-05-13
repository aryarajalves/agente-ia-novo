import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from datetime import datetime
import json

@pytest.mark.asyncio
async def test_webhook_dono_filter(client: AsyncClient, db_session: AsyncSession):
    # 1. Criar um webhook de teste
    import uuid
    token = f"dono-token-{uuid.uuid4().hex[:8]}"
    webhook = WebhookConfigModel(
        name="Test Webhook Dono Filter",
        token=token,
        leads_table="leads_test_dono"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    # 2. Criar eventos com diferentes "donos"
    # Evento de usuário
    ev_user = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone="123456789",
        mensagem="Mensagem do usuario",
        dono="usuario",
        status="completed",
        event_type="message",
        created_at=datetime.utcnow()
    )
    
    # Evento de agente
    ev_agent = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone="123456789",
        mensagem="Resposta do agente",
        dono="agente",
        status="completed",
        event_type="message",
        created_at=datetime.utcnow()
    )

    db_session.add_all([ev_user, ev_agent])
    await db_session.commit()

    # 3. Testar filtro "usuario"
    resp_user = await client.get(f"/webhooks/{webhook.id}/events?dono=usuario")
    assert resp_user.status_code == 200
    data_user = resp_user.json()
    assert data_user["total"] == 1
    assert data_user["items"][0]["dono"] == "usuario"

    # 4. Testar filtro "agente"
    resp_agent = await client.get(f"/webhooks/{webhook.id}/events?dono=agente")
    assert resp_agent.status_code == 200
    data_agent = resp_agent.json()
    assert data_agent["total"] == 1
    assert data_agent["items"][0]["dono"] == "agente"

    # 5. Testar sem filtro ou filtro "all"
    resp_all = await client.get(f"/webhooks/{webhook.id}/events?dono=all")
    assert resp_all.status_code == 200
    data_all = resp_all.json()
    assert data_all["total"] == 2
