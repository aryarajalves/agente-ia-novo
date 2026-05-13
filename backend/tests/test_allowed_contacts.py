import pytest
import json
from sqlalchemy import select
from models import WebhookConfigModel

@pytest.mark.asyncio
async def test_allowed_contacts_filter(client, db_session):
    """
    Testa se o filtro de contatos permitidos está funcionando corretamente.
    """
    # 1. Setup: Criar uma config com contatos permitidos específicos
    allowed_phone = "5511999998888"
    allowed_name = "João Silva"
    token = "test_allowed_token"
    
    # Limpar qualquer config anterior com o mesmo token
    existing = await db_session.execute(select(WebhookConfigModel).where(WebhookConfigModel.token == token))
    existing_config = existing.scalar_one_or_none()
    if existing_config:
        await db_session.delete(existing_config)
        await db_session.commit()

    config = WebhookConfigModel(
        name="Test Allowed Contacts",
        token=token,
        is_active=True,
        allowed_contacts=json.dumps([allowed_phone, allowed_name]),
        leads_table="leads_test" # Tabela separada para teste
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)
    
    try:
        # 2. Testar contato permitido (por telefone)
        payload_allowed_phone = {
            "id": "msg_allowed_1",
            "content": "Olá, sou permitido pelo telefone",
            "sender": {"phone_number": allowed_phone, "name": "Alguem"},
            "message_type": "incoming"
        }
        response = await client.post(f"/webhooks/receive/{token}", json=payload_allowed_phone)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert response.json().get("status") != "blocked"

        # 3. Testar contato permitido (por nome)
        payload_allowed_name = {
            "id": "msg_allowed_2",
            "content": "Olá, sou permitido pelo nome",
            "sender": {"phone_number": "5511000000000", "name": allowed_name},
            "message_type": "incoming"
        }
        response = await client.post(f"/webhooks/receive/{token}", json=payload_allowed_name)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert response.json().get("status") != "blocked"

        # 4. Testar contato BLOQUEADO
        payload_blocked = {
            "id": "msg_blocked_1",
            "content": "Olá, eu deveria ser bloqueado",
            "sender": {"phone_number": "5511777777777", "name": "Estranho"},
            "message_type": "incoming"
        }
        response = await client.post(f"/webhooks/receive/{token}", json=payload_blocked)
        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert response.json()["status"] == "blocked"
        assert response.json()["reason"] == "contact not in allowed list"
        
    finally:
        # Cleanup (o commit aqui é importante para remover do banco real se não estiver usando DB de teste)
        await db_session.delete(config)
        await db_session.commit()
