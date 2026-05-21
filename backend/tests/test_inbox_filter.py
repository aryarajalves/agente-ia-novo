import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_webhook_inbox_id_filtering(client: AsyncClient, db_session: AsyncSession):
    # 1. Criar um webhook com chatwoot_inbox_id = "5"
    wh_data = {
        "name": "Test Inbox Filter",
        "leads_table": "test_inbox_filter",
        "is_active": True,
        "chatwoot_inbox_id": "5"
    }
    response = await client.post("/webhooks", json=wh_data)
    assert response.status_code == 201
    wh = response.json()
    token = wh["token"]

    # 2. Enviar webhook com Inbox ID correspondente ("5")
    payload_matching = {
        "event": "message_created",
        "message_type": "incoming",
        "content": "Olá",
        "conversation": {
            "id": 123,
            "inbox_id": 5
        },
        "sender": {
            "id": 456,
            "phone_number": "+5511999998888",
            "name": "Cliente Teste"
        },
        "account": {"id": 1}
    }
    resp_matching = await client.post(f"/webhooks/receive/{token}", json=payload_matching)
    assert resp_matching.status_code == 200
    # Não deve ser ignorado por causa do inbox
    assert resp_matching.json().get("status") != "ignored_inbox"

    # 3. Enviar webhook com Inbox ID diferente ("4")
    payload_mismatch = {
        "event": "message_created",
        "message_type": "incoming",
        "content": "Olá de novo",
        "conversation": {
            "id": 123,
            "inbox_id": 4
        },
        "sender": {
            "id": 456,
            "phone_number": "+5511999998888",
            "name": "Cliente Teste"
        },
        "account": {"id": 1}
    }
    resp_mismatch = await client.post(f"/webhooks/receive/{token}", json=payload_mismatch)
    assert resp_mismatch.status_code == 200
    # Deve ser ignorado imediatamente
    assert resp_mismatch.json().get("status") == "ignored_inbox"

    # 4. Criar um webhook SEM chatwoot_inbox_id e testar que não ignora nada
    wh_data_no_filter = {
        "name": "Test No Inbox Filter",
        "leads_table": "test_no_inbox_filter",
        "is_active": True
    }
    response_no_filter = await client.post("/webhooks", json=wh_data_no_filter)
    assert response_no_filter.status_code == 201
    wh_no_filter = response_no_filter.json()
    token_no_filter = wh_no_filter["token"]

    resp_no_filter_mismatch = await client.post(f"/webhooks/receive/{token_no_filter}", json=payload_mismatch)
    assert resp_no_filter_mismatch.status_code == 200
    assert resp_no_filter_mismatch.json().get("status") != "ignored_inbox"
