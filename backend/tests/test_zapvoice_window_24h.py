import pytest
from httpx import AsyncClient
from sqlalchemy import text
from webhooks.service import ensure_leads_table
from datetime import datetime, timedelta

@pytest.fixture
async def admin_headers(client: AsyncClient):
    admin_email = "aryarajmarketing@gmail.com"
    admin_password = "123456"
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def test_webhook(db_session):
    await ensure_leads_table("leads")
    res = await db_session.execute(text(
        "INSERT INTO webhook_configs (name, token, description, is_active, leads_table, delay_seconds) "
        "VALUES ('Webhook Teste ZapVoice', 'token_zapvoice_123', 'Teste', true, 'leads', 30) RETURNING id"
    ))
    webhook_id = res.fetchone()[0]
    await db_session.commit()
    return webhook_id

@pytest.mark.asyncio
async def test_zapvoice_window_remaining(client: AsyncClient, admin_headers, test_webhook, db_session):
    import uuid
    msg_id = f"msg_zapvoice_{uuid.uuid4().hex}"
    # Payload simulando o reenvio do ZapVoice com janela de 24h restante de 3 horas (10800 segundos)
    payload = {
        "client_id": "1",
        "event": "message_create",
        "labels": [],
        "message": {
            "id": msg_id,
            "content": "Olá, esta é uma mensagem reenviada",
            "conversation_id": "9999",
            "sender_type": "contact",
            "message_type": "text"
        },
        "contact": {
            "phone": "5585996123586",
            "name": "Aryaraj Teste",
            "labels": []
        },
        "window_24h": {
            "remaining_seconds": 10800  # 3 horas restantes
        }
    }

    # Limpar leads/eventos anteriores
    await db_session.execute(text("DELETE FROM leads WHERE telefone = '5585996123586'"))
    await db_session.commit()

    # Chamar o webhook
    response = await client.post("/webhooks/receive/token_zapvoice_123", json=payload)
    assert response.status_code == 200

    # Consultar o lead criado no banco
    res_lead = await db_session.execute(text("SELECT ultima_mensagem_em FROM leads WHERE telefone = '5585996123586'"))
    row = res_lead.fetchone()
    assert row is not None
    ultima_mensagem_em = row[0]

    # Como restavam 10800s (3 horas) da janela de 24h,
    # a data 'ultima_mensagem_em' deve ser aproximadamente 21 horas atrás (86400s - 10800s = 75600s = 21h).
    now = datetime.utcnow()
    expected_diff = timedelta(hours=21)
    diff = now - ultima_mensagem_em

    # Margem de tolerância de 30 segundos
    assert abs(diff.total_seconds() - expected_diff.total_seconds()) < 30


@pytest.mark.asyncio
async def test_zapvoice_window_expired(client: AsyncClient, admin_headers, test_webhook, db_session):
    import uuid
    msg_id = f"msg_zapvoice_{uuid.uuid4().hex}"
    # Payload simulando o reenvio do ZapVoice com janela de 24h expirada
    payload = {
        "client_id": "1",
        "event": "message_create",
        "labels": [],
        "message": {
            "id": msg_id,
            "content": "Olá, janela expirada",
            "conversation_id": "9999",
            "sender_type": "contact",
            "message_type": "text"
        },
        "contact": {
            "phone": "5585996123587",
            "name": "Aryaraj Teste 2",
            "labels": []
        },
        "window_expired": True
    }

    # Limpar leads anteriores
    await db_session.execute(text("DELETE FROM leads WHERE telefone = '5585996123587'"))
    await db_session.commit()

    # Chamar o webhook
    response = await client.post("/webhooks/receive/token_zapvoice_123", json=payload)
    assert response.status_code == 200

    # Consultar o lead criado no banco
    res_lead = await db_session.execute(text("SELECT ultima_mensagem_em FROM leads WHERE telefone = '5585996123587'"))
    row = res_lead.fetchone()
    assert row is not None
    ultima_mensagem_em = row[0]

    # Como a janela expirou, deve estar marcada com mais de 24 horas atrás (setamos como 25 horas atrás)
    now = datetime.utcnow()
    diff = now - ultima_mensagem_em
    assert diff.total_seconds() > 24 * 3600  # mais de 24 horas
