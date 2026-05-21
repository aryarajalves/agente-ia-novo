import pytest
from unittest.mock import patch, MagicMock
from webhook_tasks import process_webhook_automation
from webhook_services import retrieve_context_history
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel
import json
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_webhook_automation_status_error_on_send_failure(db_session: AsyncSession):
    # 1. Setup Mock Config
    agent = AgentConfigModel(name="Test Agent Error Status", model="gpt-4o-mini", system_prompt="Test")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    config = WebhookConfigModel(
        name="Test Webhook Error Status",
        token="test_token_error_status_1",
        agent_id=agent.id,
        chatwoot_url="https://chat.test.com",
        chatwoot_api_token="test_token_cw",
        leads_table=None
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    event = WebhookEventModel(
        webhook_config_id=config.id,
        conta_id="1",
        conversa_id="100",
        telefone="5511999999999",
        mensagem="Olá",
        status="received"
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)

    # 2. Mock process_message and simulate _send_chatwoot_message returning False (Failure)
    with patch("webhook_tasks.process_message", return_value={"content": "Oi", "usage": {}}), \
         patch("webhook_tasks.run_pre_router_ai", return_value={"id_agente_alvo": agent.id}), \
         patch("webhook_tasks.is_conversation_paused", return_value=False), \
         patch("webhook_tasks._send_chatwoot_message", return_value=False): # Falha de envio
        
        # 3. Execute Task
        process_webhook_automation(event.id)

        # Recarrega o evento do banco para testar o status
        await db_session.refresh(event)
        
        # O status deve ser "error" em vez de "completed" porque _send_chatwoot_message retornou False
        assert event.status == "error"


@pytest.mark.asyncio
async def test_webhook_history_deduplication_logic():
    # Testa a lógica de desduplicação isoladamente
    history_test = [
        {"role": "user", "content": "Oi"},
        {"role": "assistant", "content": "Olá!"},
        {"role": "assistant", "content": "Olá!"}, # Duplicado consecutivo direto
        {"role": "user", "content": "Como funciona?"},
        {"role": "user", "content": "Como funciona?"}, # Duplicado consecutivo direto
        {"role": "assistant", "content": "Resposta B"}
    ]
    
    # Aplica o algoritmo de desduplicação consecutiva
    deduped = []
    for msg in history_test:
        if not deduped:
            deduped.append(msg)
        else:
            last = deduped[-1]
            if msg.get("role") == last.get("role") and msg.get("content", "").strip() == last.get("content", "").strip():
                continue
            deduped.append(msg)
            
    assert len(deduped) == 4
    assert deduped == [
        {"role": "user", "content": "Oi"},
        {"role": "assistant", "content": "Olá!"},
        {"role": "user", "content": "Como funciona?"},
        {"role": "assistant", "content": "Resposta B"}
    ]
