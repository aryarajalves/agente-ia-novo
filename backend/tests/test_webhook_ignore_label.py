import pytest
from httpx import AsyncClient
from models import WebhookConfigModel
from sqlalchemy.ext.asyncio import AsyncSession
import json

@pytest.mark.asyncio
async def test_webhook_ignore_by_label(client: AsyncClient, db_session: AsyncSession):
    # 1. Criar um webhook com ignore_by_label
    wh_data = {
        "name": "Test Ignore Label",
        "leads_table": "test_ignore_label",
        "is_active": True,
        "ignore_by_label": "atendimento-humano"
    }
    response = await client.post("/webhooks", json=wh_data)
    assert response.status_code == 201
    wh = response.json()
    token = wh["token"]

    # 2. Enviar webhook SEM a etiqueta de bloqueio
    payload_ok = {
        "event": "message_created",
        "message_type": "incoming",
        "content": "Olá",
        "conversation": {
            "id": 123,
            "labels": ["venda"]
        },
        "sender": {
            "id": 456,
            "phone_number": "+5511999998888",
            "name": "Cliente Teste"
        },
        "account": {"id": 1}
    }
    resp_ok = await client.post(f"/webhooks/receive/{token}", json=payload_ok)
    assert resp_ok.status_code == 200
    # Como o processamento é async (celery), aqui só verificamos que não foi ignorado de imediato
    # (ou se foi ignorado por outro motivo, mas não pelo label)
    assert resp_ok.json().get("status") != "ignored" or resp_ok.json().get("reason") != "contact has block label: atendimento-humano"

    # 3. Enviar webhook COM a etiqueta de bloqueio
    payload_blocked = {
        "event": "message_created",
        "message_type": "incoming",
        "content": "Olá de novo",
        "conversation": {
            "id": 123,
            "labels": ["atendimento-humano", "venda"]
        },
        "sender": {
            "id": 456,
            "phone_number": "+5511999998888",
            "name": "Cliente Teste"
        },
        "account": {"id": 1}
    }
    resp_blocked = await client.post(f"/webhooks/receive/{token}", json=payload_blocked)
    assert resp_blocked.status_code == 200
    assert resp_blocked.json()["status"] == "ignored"
    # Agora o reason vem do retorno do endpoint
    assert "contact has block label" in resp_blocked.json()["reason"]
