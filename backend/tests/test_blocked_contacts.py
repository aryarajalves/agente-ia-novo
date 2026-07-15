import pytest
import json
import uuid
from sqlalchemy import select
from models import WebhookConfigModel

@pytest.mark.asyncio
async def test_blocked_contacts_filter(client, db_session):
    """
    Testa se o filtro de contatos bloqueados e contatos permitidos está funcionando corretamente.
    """
    blocked_phone = "999991111"  # Apenas 9 dígitos
    blocked_name = "Bloqueado"  # Apenas parte do nome
    allowed_phone = "999992222"  # Apenas 9 dígitos
    allowed_name = "Permitido"  # Apenas parte do nome
    token = f"test_blocked_token_{uuid.uuid4().hex[:6]}"
    
    # Limpar qualquer config anterior com o mesmo token
    existing = await db_session.execute(select(WebhookConfigModel).where(WebhookConfigModel.token == token))
    existing_config = existing.scalar_one_or_none()
    if existing_config:
        await db_session.delete(existing_config)
        await db_session.commit()

    config = WebhookConfigModel(
        name="Test Blocked Contacts",
        token=token,
        is_active=True,
        blocked_messages=json.dumps([blocked_phone, blocked_name]),
        allowed_contacts=json.dumps([allowed_phone, allowed_name]),
        leads_table="leads_test_blocked"
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)
    
    try:
        # 1. Testar contato na lista de BLOQUEADOS por telefone (combinando últimos 8 dígitos)
        payload_blocked_phone = {
            "id": f"msg_blocked_phone_{uuid.uuid4().hex[:6]}",
            "content": "Olá, sou bloqueado por telefone",
            "sender": {"phone_number": "+5511999991111", "name": "Alguem"},
            "message_type": "incoming"
        }
        response = await client.post(f"/webhooks/receive/{token}", json=payload_blocked_phone)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert response.json()["status"] == "blocked"
        assert response.json()["reason"] == "contact is blocked"

        # 2. Testar contato na lista de PERMITIDOS por telefone (não deve ser bloqueado, últimos 8 dígitos batem)
        payload_allowed_phone = {
            "id": f"msg_allowed_phone_{uuid.uuid4().hex[:6]}",
            "content": "Olá, sou permitido por telefone",
            "sender": {"phone_number": "+5511999992222", "name": "Alguem"},
            "message_type": "incoming"
        }
        response = await client.post(f"/webhooks/receive/{token}", json=payload_allowed_phone)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert response.json().get("status") != "blocked"

        # 4. Testar contato que NÃO está na lista de permitidos (últimos 8 dígitos não batem)
        payload_not_allowed = {
            "id": f"msg_not_allowed_{uuid.uuid4().hex[:6]}",
            "content": "Olá, não estou na lista de permitidos",
            "sender": {"phone_number": "5511888888888", "name": "Outro Contato"},
            "message_type": "incoming"
        }
        response = await client.post(f"/webhooks/receive/{token}", json=payload_not_allowed)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert response.json()["status"] == "blocked"
        assert response.json()["reason"] == "contact not in allowed list"
        
    finally:
        # Cleanup
        await db_session.delete(config)
        await db_session.commit()
