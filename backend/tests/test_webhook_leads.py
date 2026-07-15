import pytest
import os
from datetime import datetime
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
    res = await db_session.execute(text("INSERT INTO webhook_configs (name, token, description, is_active, leads_table) VALUES ('Webhook Teste', 'token_teste_123', 'Teste de Leads', true, 'leads') RETURNING id"))
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
        "ultima_mensagem_em": datetime(2026, 5, 10, 11, 53, 24),
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
    
    assert "leads" in data
    # Encontrar o lead que criamos
    lead = next((l for l in data["leads"] if l["telefone"] == test_lead["telefone"]), None)
    
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
    
    lead = next((l for l in data["leads"] if l["telefone"] == test_lead["telefone"]), None)
    assert "janela_24h_aberta" in lead
    assert isinstance(lead["janela_24h_aberta"], bool)

@pytest.mark.asyncio
async def test_list_leads_filter_sem_mensagem(client: AsyncClient, admin_headers, test_webhook, db_session):
    """Valida se o filtro 'sem_mensagem' retorna corretamente leads com ou sem mensagem baseado no historico de eventos."""
    # Criamos um lead com mensagem
    lead_com_msg = {
        "webhook_id": test_webhook,
        "telefone": "558599999999",
        "contato_nome": "Lead Com Msg",
        "mensagem": "Eu tenho mensagem!",
        "ultima_mensagem_em": datetime(2026, 5, 10, 11, 53, 24),
        "pode_enviar": True,
        "conta_id": "1",
        "contato_id": "1111",
        "inbox_id": "5",
        "conversa_id": "555",
        "inbox_nome": "WhatsApp Teste"
    }
    
    # Criamos um lead sem mensagem (mensagem = None/vazio)
    lead_sem_msg = {
        "webhook_id": test_webhook,
        "telefone": "558588888888",
        "contato_nome": "Lead Sem Msg",
        "mensagem": None,
        "ultima_mensagem_em": None,
        "pode_enviar": True,
        "conta_id": "1",
        "contato_id": "2222",
        "inbox_id": "5",
        "conversa_id": "666",
        "inbox_nome": "WhatsApp Teste"
    }
    
    # Limpar leads anteriores com esses telefones
    await db_session.execute(text("DELETE FROM leads WHERE telefone IN ('558599999999', '558588888888')"))
    await db_session.execute(text("DELETE FROM webhook_events WHERE telefone IN ('558599999999', '558588888888')"))
    
    query = text("""
        INSERT INTO leads (
            webhook_config_id, telefone, contato_nome, mensagem, ultima_mensagem_em, 
            pode_enviar_mensagem, conta_id, contato_id, inbox_id, conversa_id, inbox_nome
        ) VALUES (
            :webhook_id, :telefone, :contato_nome, :mensagem, :ultima_mensagem_em, 
            :pode_enviar, :conta_id, :contato_id, :inbox_id, :conversa_id, :inbox_nome
        )
    """)
    await db_session.execute(query, lead_com_msg)
    await db_session.execute(query, lead_sem_msg)
    
    # Inserir evento de webhook simulando mensagem recebida pelo usuário para o lead_com_msg
    await db_session.execute(text("""
        INSERT INTO webhook_events (webhook_config_id, telefone, dono, status, event_type)
        VALUES (:wid, '558599999999', 'usuario', 'completed', 'message')
    """), {"wid": test_webhook})
    
    # Inserir evento de webhook simulando mensagem de outra plataforma para o lead_sem_msg (não deve contar como mensagem do usuário)
    await db_session.execute(text("""
        INSERT INTO webhook_events (webhook_config_id, telefone, dono, status, event_type)
        VALUES (:wid, '558588888888', 'agente', 'completed', 'message')
    """), {"wid": test_webhook})
    
    await db_session.commit()
    
    # 1. Buscar apenas sem_mensagem = True
    response = await client.get(f"/webhooks/{test_webhook}/leads?sem_mensagem=true", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "leads" in data
    leads = data["leads"]
    
    # Deve conter o lead sem mensagem, mas não o lead com mensagem
    telefones = [item["telefone"] for item in leads]
    assert "558588888888" in telefones
    assert "558599999999" not in telefones
    
    # 2. Buscar apenas sem_mensagem = False (com mensagem)
    response = await client.get(f"/webhooks/{test_webhook}/leads?sem_mensagem=false", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "leads" in data
    leads = data["leads"]
    
    # Deve conter o lead com mensagem, mas não o lead sem mensagem
    telefones = [item["telefone"] for item in leads]
    assert "558599999999" in telefones
    assert "558588888888" not in telefones
