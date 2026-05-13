import pytest
from sqlalchemy import text, delete
from datetime import datetime, timedelta
from models import WebhookConfigModel, WebhookEventModel

async def create_webhook(session, name="Test Webhook", leads_table="test_leads"):
    config = WebhookConfigModel(
        name=name,
        token=f"token_{name.lower().replace(' ', '_')}_{datetime.utcnow().timestamp()}",
        leads_table=leads_table,
        is_active=True
    )
    session.add(config)
    await session.commit()
    await session.refresh(config)
    
    # Criar a tabela de leads dinâmica se não existir
    # Usamos execute pois é SQL puro
    await session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {leads_table} (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            telefone VARCHAR,
            contato_nome VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            pode_enviar_mensagem BOOLEAN DEFAULT TRUE,
            ultima_mensagem_em TIMESTAMP
        )
    """))
    # Limpar a tabela caso ela já exista de testes anteriores
    await session.execute(text(f"DELETE FROM {leads_table}"))
    await session.commit()
    return config

@pytest.mark.asyncio
async def test_get_webhook_leads_pagination(client, db_session):
    config = await create_webhook(db_session, "Leads Pag", "leads_pag_test")
    
    # Inserir 25 leads
    for i in range(25):
        await db_session.execute(text(f"""
            INSERT INTO leads_pag_test (webhook_config_id, telefone, contato_nome, updated_at)
            VALUES (:wid, :tel, :nome, :ua)
        """), {
            "wid": config.id,
            "tel": f"5585999900{i:02d}",
            "nome": f"Lead {i:02d}",
            "ua": datetime.utcnow() - timedelta(minutes=(25-i)) # Garantir ordem decrescente por updated_at
        })
    await db_session.commit()

    # Testar página 1 com 10 itens
    response = await client.get(f"/webhooks/{config.id}/leads?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 25
    assert len(data["leads"]) == 10
    assert data["page"] == 1
    assert data["page_size"] == 10

    # Testar página 3 com 10 itens (deve ter 5)
    response = await client.get(f"/webhooks/{config.id}/leads?page=3&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["leads"]) == 5
    assert data["page"] == 3

@pytest.mark.asyncio
async def test_get_webhook_events_pagination(client, db_session):
    # Limpar eventos globais
    await db_session.execute(delete(WebhookEventModel))
    await db_session.commit()

    config = await create_webhook(db_session, "Events Pag", "events_pag_test")
    
    # Inserir 30 eventos
    for i in range(30):
        event = WebhookEventModel(
            webhook_config_id=config.id,
            event_type="message",
            telefone="558599990000",
            contato_nome="Test User",
            status="completed",
            created_at=datetime.utcnow() - timedelta(minutes=i)
        )
        db_session.add(event)
    await db_session.commit()

    # Testar página 1 com 20 itens (default)
    response = await client.get(f"/webhooks/{config.id}/events?page=1&limit=20")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 30
    assert len(data["items"]) == 20

    # Testar página 2 com 20 itens (deve ter 10)
    response = await client.get(f"/webhooks/{config.id}/events?page=2&limit=20")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10

@pytest.mark.asyncio
async def test_get_lead_history_pagination(client, db_session):
    # Limpar eventos globais
    await db_session.execute(delete(WebhookEventModel))
    await db_session.commit()

    config = await create_webhook(db_session, "History Pag", "history_pag_test")
    tel = "558599998877"
    
    # Inserir 15 eventos, cada um com msg e resposta (total 30 mensagens)
    for i in range(15):
        event = WebhookEventModel(
            webhook_config_id=config.id,
            event_type="message",
            telefone=tel,
            mensagem=f"Pergunta {i}",
            agent_response=f"Resposta {i}",
            created_at=datetime.utcnow() - timedelta(minutes=i)
        )
        db_session.add(event)
    await db_session.commit()

    # Testar página 1 com 10 eventos (deve retornar 20 mensagens)
    response = await client.get(f"/webhooks/{config.id}/leads/{tel}/history?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 30 # total de itens (mensagens)
    assert len(data["items"]) == 20 # 10 eventos * 2 itens cada
    assert data["page"] == 1
    
    # Testar página 2 com 10 eventos (deve retornar 10 mensagens restantes)
    response = await client.get(f"/webhooks/{config.id}/leads/{tel}/history?page=2&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10
    assert data["page"] == 2
