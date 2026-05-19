import pytest
import json
from unittest.mock import patch, MagicMock
from webhook_tasks import broadcast_status

def test_broadcast_status_success():
    """
    Testa se a função broadcast_status envia a publicação correta via redis síncrono.
    """
    mock_redis_instance = MagicMock()
    
    with patch("redis.Redis.from_url", return_value=mock_redis_instance) as mock_from_url:
        broadcast_status(
            webhook_id=10,
            event_id=20,
            status="processing",
            steps=[{"step": "Início", "detail": "Testando"}]
        )
        
        # Valida que instanciou o Redis com a URL padrão ou de ambiente
        mock_from_url.assert_called_once()
        
        # Valida que chamou o publish com o canal 'websocket_broadcast' e o JSON correto
        mock_redis_instance.publish.assert_called_once()
        args, kwargs = mock_redis_instance.publish.call_args
        assert args[0] == "websocket_broadcast"
        
        payload = json.loads(args[1])
        assert payload["type"] == "status_update"
        assert payload["webhook_id"] == 10
        assert payload["event_id"] == 20
        assert payload["status"] == "processing"
        assert len(payload["steps"]) == 1
        
        # Valida que fechou o cliente redis
        mock_redis_instance.close.assert_called_once()
