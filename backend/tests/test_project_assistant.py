import pytest
import os
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import WebhookConfigModel, SaleModel, SupportRequestModel
from database import get_db
from sqlalchemy import text
from datetime import datetime, timezone
from webhook_services import get_project_assistant_context

@pytest.mark.asyncio
async def test_sales_endpoints(client: AsyncClient, db_session: AsyncSession):
    # 1. Enviar post de venda (sem autenticação, público para webhooks)
    sale_data = {
        "email": "cliente@teste.com",
        "telefone": "+5511999998888",
        "valor": 1500.0,
        "plataforma": "Kiwify"
    }
    
    # Executa o post
    api_key = os.getenv("AGENT_API_KEY", "test-api-key")
    headers = {"X-API-Key": api_key}
    response = await client.post("/sales/receive", json=sale_data)
    assert response.status_code == 201
    assert response.json()["success"] is True
    sale_id = response.json()["sale_id"]

    # 2. Listar vendas (requer chave de API)
    list_response = await client.get("/sales", headers=headers)
    assert list_response.status_code == 200
    sales = list_response.json()
    assert len(sales) > 0
    assert sales[0]["id"] == sale_id
    assert sales[0]["email"] == "cliente@teste.com"
    assert sales[0]["valor"] == 1500.0
    assert sales[0]["plataforma"] == "Kiwify"

@pytest.mark.asyncio
async def test_project_assistant_context_retrieval(db_session: AsyncSession):
    # Configurar dados fictícios no banco
    # 1. Webhook config (inclui token e memory_token obrigatórios)
    config = WebhookConfigModel(
        name="Teste Config",
        token="teste_token_config",
        memory_token="teste_mem_token_config",
        leads_table="leads",
        is_active=True
    )
    db_session.add(config)
    
    # 2. Inserir venda fictícia
    sale = SaleModel(
        email="venda@projeto.com",
        telefone="+5511988887777",
        valor=299.9,
        plataforma="Hotmart",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(sale)

    # 3. Inserir suporte fictício
    support = SupportRequestModel(
        session_id="session_test",
        user_name="Gestor Teste",
        contact_phone="+5511977776666",
        user_email="gestor@projeto.com",
        status="OPEN",
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(support)
    
    await db_session.commit()
    await db_session.refresh(config)

    # Executar a coleta de contexto
    ctx = await get_project_assistant_context(db_session, config)
    assert ctx is not None
    assert ctx["sales_count"] >= 1
    assert ctx["sales_total"] >= 299.9
    assert len(ctx["support_requests"]) >= 1
    assert ctx["support_requests"][0]["nome"] == "Gestor Teste"
