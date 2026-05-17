import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from datetime import datetime

@pytest.mark.asyncio
async def test_webhook_event_type_all(client: AsyncClient, db_session: AsyncSession):
    # 1. Criar um webhook de teste
    import uuid
    token = f"event-type-token-{uuid.uuid4().hex[:8]}"
    webhook = WebhookConfigModel(
        name="Test Webhook Event Type Filter",
        token=token,
        leads_table="leads_test_event_type"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    # 2. Criar eventos de mensagem (message) e memória (memory)
    ev_msg = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone="123456789",
        mensagem="Mensagem de teste normal",
        dono="usuario",
        status="completed",
        event_type="message",
        created_at=datetime.utcnow()
    )
    
    ev_mem = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone="123456789",
        mensagem="Mensagem do webhook de memoria",
        dono="usuario",
        status="completed",
        event_type="memory",
        created_at=datetime.utcnow()
    )

    db_session.add_all([ev_msg, ev_mem])
    await db_session.commit()

    # 3. Testar filtro "message" (padrão de mensagem normal)
    resp_msg = await client.get(f"/webhooks/{webhook.id}/events?event_type=message")
    assert resp_msg.status_code == 200
    data_msg = resp_msg.json()
    assert data_msg["total"] == 1
    assert data_msg["items"][0]["event_type"] == "message"

    # 4. Testar filtro "memory"
    resp_mem = await client.get(f"/webhooks/{webhook.id}/events?event_type=memory")
    assert resp_mem.status_code == 200
    data_mem = resp_mem.json()
    assert data_mem["total"] == 1
    assert data_mem["items"][0]["event_type"] == "memory"

    # 5. Testar filtro "all" para trazer ambos
    resp_all = await client.get(f"/webhooks/{webhook.id}/events?event_type=all")
    assert resp_all.status_code == 200
    data_all = resp_all.json()
    assert data_all["total"] == 2
    types = [item["event_type"] for item in data_all["items"]]
    assert "message" in types
    assert "memory" in types
