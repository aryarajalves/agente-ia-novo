
import pytest
from unittest.mock import patch, MagicMock
from webhook_tasks import process_webhook_automation
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel
import json
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_webhook_automatic_labels_logic(db_session: AsyncSession):
    # 1. Setup Mock Config
    agent = AgentConfigModel(name="Test Agent Labels", model="gpt-4o-mini", system_prompt="Test")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    config = WebhookConfigModel(
        name="Test Webhook Labels",
        token="test_token_labels_102",
        agent_id=agent.id,
        chatwoot_url="https://chat.test.com",
        chatwoot_api_token="test_token_cw",
        labels_on_message=json.dumps(["tag1", "tag2"]),
        leads_table="leads"
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

    # 2. Mock process_message and other utilities
    with patch("webhook_tasks.process_message", return_value={"content": "Oi", "usage": {}}), \
         patch("webhook_tasks.sync_conversation_labels") as mock_sync_labels, \
         patch("webhook_tasks._send_chatwoot_message", return_value=True), \
         patch("webhook_tasks.run_pre_router_ai", return_value={"id_agente_alvo": agent.id}), \
         patch("webhook_tasks.is_conversation_paused", return_value=False):
        
        # 3. Execute Task
        process_webhook_automation(event.id)

        # 4. Verify labels sync was called
        mock_sync_labels.assert_called()
        
        # Verify specific call
        found = False
        for call_args in mock_sync_labels.call_args_list:
            args = call_args.args
            kwargs = call_args.kwargs
            
            # sync_conversation_labels(cw_url, account_id, conversation_id, token, to_add=..., to_remove=...)
            if kwargs.get("to_add") == ["tag1", "tag2"]:
                # Check positional args
                assert args[1] == 1    # account_id
                assert args[2] == 100  # conversation_id
                found = True
        
        assert found, f"Call with to_add=['tag1', 'tag2'] not found"
