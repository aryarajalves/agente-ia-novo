import pytest
from fastapi.testclient import TestClient
from main import app
from database import async_session
from models import WebhookConfigModel, UserMemoryModel, WebhookEventModel
from sqlalchemy import select

@pytest.mark.asyncio
async def test_receive_memory_webhook_refinement():
    client = TestClient(app)
    
    # 1. Setup: Create a webhook config
    async with async_session() as session:
        # Limpar dados antigos de teste se houver
        await session.execute(text("DELETE FROM webhook_events"))
        await session.execute(text("DELETE FROM user_memory"))
        await session.execute(text("DELETE FROM webhook_configs WHERE token='token-test'"))
        await session.commit()

        config = WebhookConfigModel(
            name="Test Memory Refinement",
            token="token-test",
            memory_token="memory-token-test",
            leads_table="leads",
            is_active=True,
            memory_sync_enabled=True,
            memory_phone_path="contact_phone", # Usando o campo direto
            memory_name_path="contact_name"
        )
        session.add(config)
        await session.commit()
        await session.refresh(config)
        config_id = config.id

    # 2. Action: Send memory webhook with mixed fields
    payload = {
        "contact_name": "Teste ZapVoice",
        "contact_phone": "5512999999999",
        "template_name": "template_teste",
        "template_content": "Esta é uma mensagem de teste.",
        "timestamp": "2026-04-21T14:19:56.510+00:00",
        "client_id": "3",  # Deve ser ignorado
        "node_id": "test_node" # Deve ser ignorado
    }
    
    response = client.post("/webhooks/memory/memory-token-test", json=payload)
    
    # 3. Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    # Devem ser processados 5 campos: Nome, Telefone, Modelo, Conteúdo, Data
    assert data["processed_fields"] == 5
    
    # 4. Verify Database
    async with async_session() as session:
        # Check UserMemory entries (devem estar em português)
        stmt = select(UserMemoryModel).where(UserMemoryModel.session_id == "5512999999999")
        res = await session.execute(stmt)
        memories = res.scalars().all()
        keys = [m.key for m in memories]
        
        assert "Nome do Contato" in keys
        assert "Telefone do Contato" in keys
        assert "Nome do Modelo" in keys
        assert "Conteúdo do Modelo" in keys
        assert "Data e Hora" in keys
        
        # Verificar o formato da data (Brasília UTC-3)
        # 14:19 UTC -> 11:19 Brasília
        date_mem = next(m for m in memories if m.key == "Data e Hora")
        assert date_mem.value == "21/04/2026 11:19:56"
        
        # Verificar que campos extras NÃO foram salvos
        assert "client_id" not in keys
        assert "node_id" not in keys
        
        # Check WebhookEvent entry
        stmt = select(WebhookEventModel).where(
            WebhookEventModel.webhook_config_id == config_id,
            WebhookEventModel.event_type == "memory"
        )
        res = await session.execute(stmt)
        event = res.scalars().first()
        assert event is not None
        assert "Nome do Contato=Teste ZapVoice" in event.mensagem
        assert "Data e Hora=21/04/2026 11:19:56" in event.mensagem

from sqlalchemy import text # Import necessário para o setup
