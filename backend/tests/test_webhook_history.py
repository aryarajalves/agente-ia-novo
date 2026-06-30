import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from datetime import datetime

@pytest.mark.asyncio
async def test_get_lead_history(client: AsyncClient, db_session: AsyncSession):
    # 1. Criar um webhook de teste
    import uuid
    from webhooks.service import ensure_leads_table
    await ensure_leads_table("leads_test_history")
    
    token = f"history-token-{uuid.uuid4().hex[:8]}"
    webhook = WebhookConfigModel(
        name="Test Webhook History",
        token=token,
        leads_table="leads_test_history"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    # 2. Criar eventos para um telefone específico
    telefone = "+5511999998888"
    
    # Evento 1: Mensagem e Resposta
    ev1 = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone=telefone,
        contato_id="cw-123",
        mensagem="Ola, tudo bem?",
        agent_response="Ola! Tudo otimo e voce?",
        created_at=datetime.utcnow()
    )
    
    # Evento 2: Só mensagem
    ev2 = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone=telefone,
        contato_id="cw-123",
        mensagem="Pode me ajudar com um pedido?",
        created_at=datetime.utcnow()
    )

    db_session.add_all([ev1, ev2])
    await db_session.commit()

    # 3. Chamar o endpoint
    response = await client.get(f"/webhooks/{webhook.id}/leads-by-phone/{telefone}/history?page=1&page_size=20")
    assert response.status_code == 200
    
    data = response.json()
    assert "items" in data
    assert data["total"] == 3 # Agora contamos mensagens individuais reais
    assert data["page"] == 1
    assert data["page_size"] == 20
    
    history = data["items"]
    
    # 2 eventos: ev1 (2 mensagens), ev2 (1 mensagem). Total 3 mensagens.
    assert len(history) == 3
    
    # ev2 é mais recente (Top). Deve ter o index 3.
    # ev1 tem agent_response (índice 2) e mensagem (índice 1).
    assert history[0]["index"] == 3 # ev2 (mais recente)
    assert history[1]["index"] == 2 # ev1 agent_response
    assert history[2]["index"] == 1 # ev1 mensagem
