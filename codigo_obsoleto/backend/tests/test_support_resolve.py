import sys
from unittest.mock import MagicMock

# Mock heavy dependencies that might be missing locally
sys.modules["anthropic"] = MagicMock()
sys.modules["openai"] = MagicMock()
sys.modules["tiktoken"] = MagicMock()
sys.modules["smart_importer"] = MagicMock()
sys.modules["router_import"] = MagicMock()
sys.modules["transcription_service"] = MagicMock()
sys.modules["s3_service"] = MagicMock()
sys.modules["tasks"] = MagicMock()
sys.modules["rag_service"] = MagicMock()

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from main import internal_resolve_support
from models import SupportRequestModel, ToolModel, WebhookConfigModel

@pytest_asyncio.fixture
async def mock_db():
    db = MagicMock(spec=AsyncSession)
    return db

@pytest.mark.asyncio
async def test_internal_resolve_support_triggers_transferir_robo(mock_db):
    # Setup mock support request
    mock_req = SupportRequestModel(
        id=1,
        agent_id=1,
        session_id="1234567890",
        status="OPEN",
        extracted_data={"user_phone": "5511999999999"},
        account_id="acc1",
        conversation_id="conv1"
    )
    
    # Setup mock tool
    mock_tool = ToolModel(
        id=10,
        name="transferir_robo",
        webhook_url="http://test-webhook.com",
        labels_to_add='["robo"]',
        labels_to_remove='["humano"]'
    )
    
    # Setup mock webhook config
    mock_config = WebhookConfigModel(
        id=1,
        agent_id=1,
        leads_table="leads_test",
        chatwoot_url="http://chatwoot.com",
        chatwoot_api_token="token123"
    )

    # Mock DB responses
    mock_db.execute = AsyncMock()
    
    # First call: select SupportRequest
    res_req = MagicMock()
    res_req.scalar_one_or_none.return_value = mock_req
    
    # Second call: select Tool
    res_tool = MagicMock()
    res_tool.scalar_one_or_none.return_value = mock_tool
    
    # Third call: select WebhookConfig
    res_config = MagicMock()
    res_config.scalar_one_or_none.return_value = mock_config
    
    # Fourth call: select GlobalContextVariable (webhook finalization)
    res_webhook_var = MagicMock()
    res_webhook_var.scalar_one_or_none.return_value = None

    mock_db.execute.side_effect = [res_req, res_tool, res_config, res_webhook_var]

    with patch("httpx.AsyncClient") as mock_client_class:
        mock_client = AsyncMock()
        mock_client_class.return_value.__aenter__.return_value = mock_client
        
        # Mock Chatwoot current labels
        mock_resp_labels = MagicMock()
        mock_resp_labels.status_code = 200
        mock_resp_labels.json.return_value = {"payload": ["humano", "teste"]}
        
        mock_resp_webhook = MagicMock()
        mock_resp_webhook.status_code = 200
        
        mock_client.get.return_value = mock_resp_labels
        mock_client.post.return_value = mock_resp_webhook

        result = await internal_resolve_support(1, mock_db)

        assert result["success"] is True
        assert mock_req.status == "RESOLVED"
        
        # Verify Tool was searched
        assert mock_db.execute.call_count >= 2
        
        # Verify Chatwoot was called
        mock_client.post.assert_any_call(
            "http://chatwoot.com/api/v1/accounts/acc1/conversations/conv1/labels",
            headers={"api_access_token": "token123", "Content-Type": "application/json"},
            json={"labels": ["teste", "robo"]}
        )
        
        # Verify Webhook was called
        mock_client.post.assert_any_call(
            "http://test-webhook.com",
            json={
                "account_id": "acc1",
                "conversation_id": "conv1",
                "contact_phone": "5511999999999",
                "support_id": 1,
                "reason": "Retorno ao robô após finalização de suporte humano"
            }
        )

@pytest.mark.asyncio
async def test_internal_resolve_support_with_regex_session_id(mock_db):
    # Setup mock support request with session_id that needs regex cleaning
    mock_req = SupportRequestModel(
        id=2,
        agent_id=1,
        session_id="+55 (11) 99999-8888",
        status="OPEN",
        extracted_data={}, # No phone in extracted_data
        account_id="acc1",
        conversation_id="conv2"
    )
    
    mock_tool = ToolModel(name="transferir_robo")
    mock_config = WebhookConfigModel(leads_table="leads_test")

    mock_db.execute = AsyncMock()
    
    res_req = MagicMock()
    res_req.scalar_one_or_none.return_value = mock_req
    res_tool = MagicMock()
    res_tool.scalar_one_or_none.return_value = mock_tool
    res_config = MagicMock()
    res_config.scalar_one_or_none.return_value = mock_config
    res_webhook_var = MagicMock()
    res_webhook_var.scalar_one_or_none.return_value = None

    mock_db.execute.side_effect = [res_req, res_tool, res_config, res_webhook_var]

    await internal_resolve_support(2, mock_db)
    
    # Verify that the update query used the cleaned phone number
    # text(f"UPDATE {config_obj.leads_table} SET pode_enviar_mensagem = TRUE WHERE telefone = :tel")
    # We check the arguments of the execute call that looks like an UPDATE
    found_update = False
    for call in mock_db.execute.call_args_list:
        args, kwargs = call
        if isinstance(args[0], str) and "UPDATE leads_test" in args[0]:
            assert kwargs["tel"] == "5511999998888"
            found_update = True
    
    # Since we used text(), it's actually a sqlalchemy.sql.elements.TextClause in most cases, 
    # but our mock receives whatever text() returns.
    # Let's adjust the check.
    for call in mock_db.execute.call_args_list:
        args, kwargs = call
        stmt = args[0]
        # In SQLAlchemy text() returns a TextClause
        if "UPDATE leads_test" in str(stmt):
            assert kwargs["params"]["tel"] == "5511999998888"
            found_update = True
            
    assert found_update is True
