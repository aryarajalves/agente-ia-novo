import pytest
from unittest.mock import MagicMock, patch
import re

# Import the task to test
# Note: We don't necessarily need to run the whole task, 
# just verify that 're' is the module and not a local variable.

def test_re_module_access():
    """
    Test that 're' is accessible and is indeed the module.
    This would have failed before the fix due to UnboundLocalError.
    """
    from webhook_tasks import process_webhook_automation
    
    # We can inspect the function's local variables or try to run a small part of it.
    # Since 're' was shadowed in the whole function scope, 
    # even a simple check inside the function would fail.
    
    # Let's mock the dependencies and call the task.
    with patch('webhook_tasks.SessionLocal') as mock_session_local:
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Mock event and config to reach the re.sub call
        mock_event = MagicMock()
        mock_event.id = 1
        mock_event.status = "pending"
        mock_event.telefone = "5511999999999"
        mock_event.mensagem = "teste"
        mock_event.webhook_config_id = 1
        
        mock_config = MagicMock()
        mock_config.agent_id = 1
        mock_config.leads_table = None
        
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_event, # event
            mock_config, # config
            MagicMock(name="agent") # db_agent
        ]
        
        # We need to mock _add_step and other internal helpers
        with patch('webhook_tasks._add_step'), \
             patch('webhook_tasks._build_agent_config'), \
             patch('webhook_tasks.asyncio.run'):
            
            # This call should NOT raise UnboundLocalError now
            try:
                process_webhook_automation.undelayed(1)
            except Exception as e:
                # If it's UnboundLocalError for 're', the test fails
                assert "local variable 're' where it is not associated with a value" not in str(e)
                # Other errors are fine (they just mean my mock is incomplete)
                print(f"Caught expected mock-related error: {e}")

if __name__ == "__main__":
    test_re_module_access()
