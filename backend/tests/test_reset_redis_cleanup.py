import pytest
import os
import json
from unittest.mock import MagicMock, patch
from webhook_tasks import process_webhook_automation

@pytest.mark.asyncio
async def test_reset_keyword_clears_redis():
    # Setup
    db = MagicMock()
    event_id = 1
    
    # Evento com a palavra-chave
    mock_event = MagicMock()
    mock_event.id = event_id
    mock_event.mensagem = "#resetar"
    mock_event.status = "waiting"
    mock_event.webhook_config_id = 1
    mock_event.telefone = "123456"
    
    # Configuração com a palavra-chave (usando objeto real para evitar problemas de mock com tipos)
    class MockConfig:
        def __init__(self):
            self.id = 1
            self.agent_id = 1
            self.delete_keywords = '["#resetar"]'
            self.delete_message = "Zerei"
            self.leads_table = "leads"
            self.chatwoot_url = None
            self.chatwoot_api_token = None
    
    config = MockConfig()
    
    # Mocking DB response
    db.query().filter().first.side_effect = [mock_event, config]
    
    # Patching redis_lib
    with patch("redis.from_url") as mock_from_url:
        mock_redis = MagicMock()
        mock_from_url.return_value = mock_redis
        
        # Patching sessionmaker to return our mock db
        with patch("webhook_tasks.SessionLocal") as mock_session:
            mock_session.return_value = db
            
            # Execute
            try:
                process_webhook_automation(event_id)
            except Exception as e:
                print(f"Erro capturado (esperado se não mockar tudo): {e}")
                
        # Assert Redis was cleared
        # Verificando se houve alguma chamada ao delete com o padrão esperado
        calls = [str(c) for c in mock_redis.delete.call_args_list]
        print(f"Chamadas ao Redis delete: {calls}")
        
        mock_redis.delete.assert_any_call("webhook:debounce:id:1:123456")
        mock_redis.delete.assert_any_call("webhook:debounce:text:1:123456")
        print("✅ Redis cleanup verified for reset keyword.")
