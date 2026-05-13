import pytest
import os
from sqlalchemy import text
from httpx import AsyncClient
from webhooks.service import ensure_leads_table

@pytest.fixture
async def admin_headers(client: AsyncClient):
    """Obtém os headers de autenticação do admin."""
    admin_email = os.getenv("ADMIN_EMAIL", "aryarajmarketing@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "123456")
    login_res = await client.post("/login", json={"email": admin_email, "password": admin_password})
    token = login_res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def test_webhook(db_session, admin_headers):
    """Garante que existe um webhook e a tabela de leads para os testes."""
    # Garantir a tabela de leads
    await ensure_leads_table("leads")
    
    # Criamos um webhook de teste
    res = await db_session.execute(text("INSERT INTO webhook_configs (name, description, active) VALUES ('Webhook Teste', 'Teste de Leads', true) RETURNING id"))
    webhook_id = res.fetchone()[0]
    await db_session.commit()
    return webhook_id

@pytest.fixture
async def test_lead(db_session, test_webhook):
    """Cria um lead de teste para validação das rotas."""
    lead_data = {
        "webhook_id": test_webhook,
        "telefone": "558596123586",
        "contato_nome": "Aryaraj Teste",
        "mensagem": "Olá, teste de lead",
        "ultima_mensagem_em": "2026-05-10 11:53:24",
        "pode_enviar": True,
        "conta_id": "1",
        "contato_id": "1079",
        "inbox_id": "5",
        "conversa_id": "534",
        "inbox_nome": "WhatsApp Teste"
    }
    
    # Limpar leads anteriores com o mesmo telefone para evitar conflito
    await db_session.execute(text("DELETE FROM leads WHERE telefone = :telefone"), {"telefone": lead_data["telefone"]})
    
    query = text("""
        INSERT INTO leads (
            webhook_config_id, telefone, contato_nome, mensagem, ultima_mensagem_em, 
            pode_enviar_mensagem, conta_id, contato_id, inbox_id, conversa_id, inbox_nome
        ) VALUES (
            :webhook_id, :telefone, :contato_nome, :mensagem, :ultima_mensagem_em, 
            :pode_enviar, :conta_id, :contato_id, :inbox_id, :conversa_id, :inbox_nome
        )
    """)
    await db_session.execute(query, lead_data)
    await db_session.commit()
    return lead_data

@pytest.mark.asyncio
async def test_list_leads_success(client: AsyncClient, admin_headers, test_lead, test_webhook):
    """Valida se a listagem de leads retorna os dados corretamente incluindo os novos metadados."""
    response = await client.get(f"/webhooks/{test_webhook}/leads", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    
    assert "items" in data
    # Encontrar o lead que criamos
    lead = next((l for l in data["items"] if l["telefone"] == test_lead["telefone"]), None)
    
    assert lead is not None
    assert lead["contato_nome"] == test_lead["contato_nome"]
    assert lead["conta_id"] == test_lead["conta_id"]
    assert lead["inbox_id"] == test_lead["inbox_id"]
    assert lead["conversa_id"] == test_lead["conversa_id"]
    assert lead["inbox_nome"] == test_lead["inbox_nome"]

@pytest.mark.asyncio
async def test_lead_window_logic(client: AsyncClient, admin_headers, test_lead, test_webhook):
    """Valida se o campo janela_24h_aberta é calculado corretamente no backend."""
    response = await client.get(f"/webhooks/{test_webhook}/leads", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    
    lead = next((l for l in data["items"] if l["telefone"] == test_lead["telefone"]), None)
    assert "janela_24h_aberta" in lead
    assert isinstance(lead["janela_24h_aberta"], bool)
