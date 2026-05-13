import pytest
import httpx
import asyncio
from sqlalchemy import select, text
from database import async_session
from models import WebhookConfigModel, WebhookEventModel, AgentConfigModel

@pytest.mark.asyncio
async def test_webhook_receive_integrity():
    """Valida se o recebimento de webhook cria o lead e o evento corretamente sem erros de placeholders."""
    async with async_session() as db:
        # 1. Garantir um agente para o teste
        agent_res = await db.execute(select(AgentConfigModel).limit(1))
        agent = agent_res.scalar_one_or_none()
        if not agent:
            agent = AgentConfigModel(name="Test Agent", model="gpt-4o-mini", is_active=True)
            db.add(agent)
            await db.commit()
            await db.refresh(agent)
        
        # 2. Criar um webhook de teste
        token = "test_integrity_token"
        webhook = WebhookConfigModel(
            name="Integracao Teste Integridade",
            token=token,
            memory_token="mem_" + token,
            leads_table="leads",
            agent_id=agent.id,
            is_active=True
        )
        # Limpar se já existir
        await db.execute(text("DELETE FROM webhook_configs WHERE token = :t"), {"t": token})
        db.add(webhook)
        await db.commit()
        await db.refresh(webhook)

        # 3. Simular envio de mensagem (oie)
        payload = {
            "account_id": 1,
            "id": 999999,
            "content": "oie teste integridade",
            "message_type": "incoming",
            "conversation": {"id": 123},
            "sender": {"id": 456, "phone_number": "+5585999999999", "name": "Aryaraj Teste"},
            "inbox": {"id": 1, "name": "WhatsApp Test"}
        }
        
        async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
            response = await client.post(f"/webhooks/receive/{token}", json=payload)
            assert response.status_code == 200
            
        # 4. Verificar se o evento foi criado no DB
        res_event = await db.execute(
            select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == webhook.id).order_by(WebhookEventModel.id.desc())
        )
        event = res_event.scalars().first()
        assert event is not None
        assert event.mensagem == "oie teste integridade"
        assert event.telefone == "5585999999999"
        
        # 5. Verificar se o lead foi criado na tabela 'leads'
        res_lead = await db.execute(
            text("SELECT count(*) FROM leads WHERE telefone = '5585999999999' AND webhook_config_id = :wid"),
            {"wid": webhook.id}
        )
        assert res_lead.scalar() > 0
        
        print("\n✅ Teste de integridade de webhook passou!")

if __name__ == "__main__":
    asyncio.run(test_webhook_receive_integrity())
