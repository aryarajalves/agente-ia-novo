import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, WebhookEventModel
from datetime import datetime
import uuid

@pytest.mark.asyncio
async def test_error_log_filter(client: AsyncClient, db_session: AsyncSession):
    # 1. Criar um webhook de teste
    token = f"error-token-{uuid.uuid4().hex[:8]}"
    webhook = WebhookConfigModel(
        name="Test Webhook Errors",
        token=token,
        leads_table="leads_test_errors"
    )
    db_session.add(webhook)
    await db_session.commit()
    await db_session.refresh(webhook)

    # 2. Criar eventos: um com sucesso e um com erro
    telefone = "+5511888887777"
    
    # Evento Sucesso
    ev_ok = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone=telefone,
        mensagem="Mensagem OK",
        status="completed",
        created_at=datetime.utcnow()
    )
    
    # Evento Erro
    ev_error = WebhookEventModel(
        webhook_config_id=webhook.id,
        telefone=telefone,
        mensagem="Mensagem Falha",
        status="error",
        legenda="❌ Erro técnico: Quota Exceeded",
        created_at=datetime.utcnow()
    )

    db_session.add_all([ev_ok, ev_error])
    await db_session.commit()

    # 3. Testar filtro 'failed_only'
    response = await client.get(f"/webhooks/{webhook.id}/events?status=failed_only")
    assert response.status_code == 200
    data = response.json()
    
    # Deve retornar apenas o evento de erro
    assert data["total"] == 1
    assert data["items"][0]["status"] == "error"
    assert "Erro técnico: Quota Exceeded" in data["items"][0]["legenda"]
    assert data["items"][0]["mensagem"] == "Mensagem Falha"

    # 4. Testar filtro 'error' (contexto de erro - deve retornar ambos pois o telefone tem erro)
    response_ctx = await client.get(f"/webhooks/{webhook.id}/events?status=error")
    assert response_ctx.status_code == 200
    data_ctx = response_ctx.json()
    assert data_ctx["total"] == 2
