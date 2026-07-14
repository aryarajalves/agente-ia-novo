import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from api.routers.support import _resumir_atendimento_robo
from models import SupportRequestModel, WebhookConfigModel

@pytest.mark.asyncio
async def test_resumir_atendimento_robo_success():
    # Setup mocks
    db = AsyncMock()
    req = SupportRequestModel(
        webhook_config_id=1,
        account_id="10",
        conversation_id="100",
        status="PENDING"
    )
    
    config = WebhookConfigModel(
        id=1,
        chatwoot_url="https://chat.test",
        chatwoot_api_token="token123",
        ignore_by_label="humano",
        ai_handoff_labels_to_add='["robo_ativo"]',
        ai_handoff_labels_to_remove='["financeiro"]',
        ai_handoff_message="Olá! O robô assumiu novamente."
    )
    
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = config
    db.execute.return_value = execute_result
    
    with patch("api.routers.support.sync_conversation_labels", new_callable=AsyncMock) as mock_sync, \
         patch("api.routers.support.send_chatwoot_message", new_callable=AsyncMock) as mock_send:
        
        await _resumir_atendimento_robo(req, db)
        
        # Verify sync_conversation_labels call
        mock_sync.assert_called_once()
        args, kwargs = mock_sync.call_args
        assert args[0] == "https://chat.test"
        assert args[1] == 10
        assert args[2] == 100
        assert "robo_ativo" in kwargs["to_add"]
        assert "humano" in kwargs["to_remove"]
        assert "financeiro" in kwargs["to_remove"]
        
        # Verify message call
        mock_send.assert_called_once_with(
            "https://chat.test", 10, 100, "token123", "Olá! O robô assumiu novamente."
        )

@pytest.mark.asyncio
async def test_resumir_atendimento_robo_no_config():
    db = AsyncMock()
    req = SupportRequestModel(webhook_config_id=99, account_id="1", conversation_id="1")
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    db.execute.return_value = execute_result
    
    with patch("api.routers.support.sync_conversation_labels", new_callable=AsyncMock) as mock_sync:
        await _resumir_atendimento_robo(req, db)
        mock_sync.assert_not_called()
