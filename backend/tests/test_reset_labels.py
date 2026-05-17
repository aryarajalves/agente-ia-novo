import pytest
from unittest.mock import patch, MagicMock
from webhook_tasks import process_webhook_automation
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel
import json
from sqlalchemy.ext.asyncio import AsyncSession

@pytest.mark.asyncio
async def test_webhook_reset_labels_substitution(db_session: AsyncSession):
    # 1. Setup Mock Config
    agent = AgentConfigModel(name="Test Agent Reset", model="gpt-4o-mini", system_prompt="Test")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    config = WebhookConfigModel(
        name="Test Webhook Reset",
        token="test_token_reset_103",
        agent_id=agent.id,
        chatwoot_url="https://chat.test.com",
        chatwoot_api_token="test_token_cw",
        delete_keywords=json.dumps(["#resetar"]),
        delete_message="Zerei a memoria do agente para esse contato.",
        delete_labels=json.dumps(["robo", "iniciar"]),
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
        mensagem="#resetar",
        status="received"
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(event)

    # 2. Mock httpx client
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "OK"
    mock_client.post.return_value = mock_resp

    with patch("httpx.Client", return_value=mock_client), \
         patch("webhook_tasks._send_chatwoot_message", return_value=True), \
         patch("webhook_tasks.is_conversation_paused", return_value=False):
        
        # 3. Execute Task
        process_webhook_automation(event.id)

        # 4. Verify httpx.Client.post was called with delete_labels
        mock_client.post.assert_called()
        
        # Verify specific post call for labels replacement
        found_labels_post = False
        for call_args in mock_client.post.call_args_list:
            args = call_args.args
            kwargs = call_args.kwargs
            
            url = args[0] if len(args) > 0 else kwargs.get("url", "")
            json_payload = kwargs.get("json", {})
            
            if "conversations/100/labels" in url:
                assert json_payload == {"labels": ["robo", "iniciar"]}
                found_labels_post = True
                
        assert found_labels_post, "A requisição POST para atualizar as etiquetas com ['robo', 'iniciar'] não foi encontrada."
