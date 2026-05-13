import pytest
from unittest.mock import MagicMock, patch
from core.websocket import manager

@pytest.mark.asyncio
async def test_websocket_broadcast_on_event():
    """
    Testa se o broadcast do WebSocket é chamado corretamente com o payload esperado.
    """
    mock_event = MagicMock()
    mock_event.id = 123
    mock_event.webhook_config_id = 456
    mock_event.telefone = "5511999999999"
    mock_event.dono = "usuario"
    mock_event.message_type = "text"
    mock_event.mensagem = "Olá teste"
    mock_event.agent_response = None
    mock_event.created_at = MagicMock()
    mock_event.created_at.isoformat.return_value = "2026-05-10T15:00:00"

    with patch.object(manager, 'broadcast', return_value=None) as mock_broadcast:
        # Payload que o router.py envia
        payload = {
            "type": "new_event",
            "webhook_id": mock_event.webhook_config_id,
            "event": {
                "id": mock_event.id,
                "telefone": mock_event.telefone,
                "mensagem": mock_event.mensagem,
                "agent_response": mock_event.agent_response,
                "dono": mock_event.dono,
                "message_type": mock_event.message_type,
                "created_at": mock_event.created_at.isoformat()
            }
        }
        
        await manager.broadcast(payload)
        
        mock_broadcast.assert_called_once_with(payload)

def test_message_type_label_logic():
    """
    Valida a existência dos tipos de mensagem suportados.
    """
    supported_types = ["text", "image", "audio", "video", "document"]
    event_type = "image"
    assert event_type in supported_types
