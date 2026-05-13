import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from datetime import datetime, timedelta
import uuid

@pytest.mark.asyncio
async def test_history_item_deletion_and_deduplication(client: AsyncClient, db_session: AsyncSession):
    # 1. Criar um webhook de teste
    token = f"del-token-{uuid.uuid4().hex[:8]}"
    webhook = WebhookConfigModel(
        name="Test Deletion Webhook",
        token=token,
        leads_table="leads_test_del"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    telefone = "+5511988887777"
    
    # Simular Duplicidade (Cenário do usuário)
    # Evento 1: Humano mandou mensagem, IA respondeu (guardado em agent_response)
    ev1 = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone=telefone,
        mensagem="Quero saber o preço",
        agent_response="O preço é R$ 100,00",
        dono="usuario",
        created_at=datetime.utcnow() - timedelta(seconds=10)
    )
    
    # Evento 2: Chatwoot manda webhook de 'outgoing' com a mesma resposta
    ev2 = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone=telefone,
        mensagem="O preço é R$ 100,00",
        dono="agente",
        created_at=datetime.utcnow() - timedelta(seconds=5)
    )

    db_session.add_all([ev1, ev2])
    await db_session.commit()

    # 2. Testar Deduplicação no GET
    response = await client.get(f"/webhooks/{webhook.id}/leads/{telefone}/history")
    assert response.status_code == 200
    data = response.json()
    
    # Sem deduplicação seriam 3 itens: ev2.msg, ev1.agent_resp, ev1.msg.
    # Com deduplicação, ev1.agent_resp deve ser omitido pois ev2.msg tem o mesmo conteúdo.
    items = data["items"]
    contents = [i["conteudo"] for i in items]
    
    assert "O preço é R$ 100,00" in contents
    assert contents.count("O preço é R$ 100,00") == 1 # Apenas uma vez!
    assert len(items) == 2 # "Quero saber o preço" e "O preço é R$ 100,00"

    # 3. Testar Deleção Individual
    event_to_delete = ev2.id
    del_response = await client.delete(f"/webhooks/{webhook.id}/leads/{telefone}/history/{event_to_delete}")
    assert del_response.status_code == 204

    # Verificar se foi deletado do banco
    from sqlalchemy import select
    check = await db_session.execute(select(WebhookEventModel).where(WebhookEventModel.id == event_to_delete))
    assert check.scalar_one_or_none() is None

    # 4. Verificar histórico após deleção
    # Agora ev2 sumiu, então ev1.agent_response deve REAPARECER (pois não há mais duplicata)
    response2 = await client.get(f"/webhooks/{webhook.id}/leads/{telefone}/history")
    data2 = response2.json()
    items2 = data2["items"]
    assert len(items2) == 2
    assert any(i["id"] == ev1.id and i["dono"] == "Agente" for i in items2)
