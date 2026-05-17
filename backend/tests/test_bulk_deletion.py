import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from main import app
from database import get_db

from models import WebhookConfigModel

async def test_bulk_delete_leads(client, db_session: AsyncSession):
    # 1. Setup: Criar um webhook e alguns leads
    config = WebhookConfigModel(id=1, name="Test Webhook 1", token="tk_1", leads_table="webhook_leads_1")
    db_session.add(config)
    await db_session.commit()
    webhook_id = config.id
    
    # Garantir que a tabela existe
    table_name = "webhook_leads_1"
    await db_session.execute(text(f"""
        CREATE TABLE IF NOT EXISTS {table_name} (
            id SERIAL PRIMARY KEY,
            webhook_config_id INTEGER,
            telefone VARCHAR,
            contato_nome VARCHAR,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    await db_session.commit()

    # Inserir leads de teste
    await db_session.execute(text(f"INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome) VALUES (1, '551190001', 'Test 1')"))
    await db_session.execute(text(f"INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome) VALUES (1, '551190002', 'Test 2')"))
    await db_session.execute(text(f"INSERT INTO {table_name} (webhook_config_id, telefone, contato_nome) VALUES (1, '551190003', 'Test 3')"))
    
    # Inserir logs associados
    await db_session.execute(text("INSERT INTO webhook_events (webhook_config_id, telefone, event_type) VALUES (1, '551190001', 'test')"))
    await db_session.execute(text("INSERT INTO webhook_events (webhook_config_id, telefone, event_type) VALUES (1, '551190002', 'test')"))
    await db_session.commit()

    # Buscar IDs
    res = await db_session.execute(text(f"SELECT id FROM {table_name} WHERE telefone IN ('551190001', '551190002')"))
    ids_to_delete = [row[0] for row in res.fetchall()]

    # 2. Executar deleção em massa via API
    response = await client.request(
        "POST", 
        f"/webhooks/{webhook_id}/leads/delete-batch",
        json={"lead_ids": ids_to_delete}
    )

    assert response.status_code == 204

    # 3. Verificar se foram deletados
    # Leads
    res_leads = await db_session.execute(text(f"SELECT COUNT(*) FROM {table_name} WHERE id = ANY(:ids)"), {"ids": ids_to_delete})
    assert res_leads.scalar() == 0
    
    # Lead 3 deve permanecer
    res_lead3 = await db_session.execute(text(f"SELECT COUNT(*) FROM {table_name} WHERE telefone = '551190003'"))
    assert res_lead3.scalar() == 1

    # Logs
    res_logs = await db_session.execute(text("SELECT COUNT(*) FROM webhook_events WHERE telefone IN ('551190001', '551190002')"))
    assert res_logs.scalar() == 0
