import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.tools.handlers.chatwoot import handle_chatwoot_handoff
from models import SupportRequestModel

@pytest.mark.asyncio
async def test_handle_chatwoot_handoff_phone_and_email_mapping():
    # Setup mocks
    db = AsyncMock()
    
    context_variables = {
        "webhook_config_id": 1,
        "account_id": "10",
        "conversation_id": "100",
        "contact_phone": "+5585999999999",
        "contact_name": "Aryaraj Alves",
        "contact_email": "aryarajmarketing@gmail.com",
        "session_id": "50"
    }
    
    # Mocking external calls (e.g. sync_conversation_labels ZapVoice e delete_all_user_memory)
    # Nota: o handler usa zapvoice_utils.sync_conversation_labels (importado no topo de
    # agent_core/tools/handlers/chatwoot.py), não mais "chatwoot_utils" (módulo que nunca existiu
    # neste projeto — resquício de uma versão anterior baseada em Chatwoot).
    with patch("agent_core.tools.handlers.chatwoot.sync_conversation_labels", new_callable=AsyncMock) as mock_sync, \
         patch("agent_core.memory.delete_all_user_memory", new_callable=AsyncMock) as mock_delete:
        
        await handle_chatwoot_handoff(
            db=db,
            context_variables=context_variables,
            target_tool=None,
            is_human=True,
            func_args_str='{"motivo": "Quero falar com suporte"}',
            history=[],
            config_id=1
        )
        
        # O db.add deve ter sido chamado com a solicitação de suporte criada
        db.add.assert_called_once()
        created_support = db.add.call_args[0][0]
        
        # Validar as colunas
        assert isinstance(created_support, SupportRequestModel)
        assert created_support.contact_phone == "+5585999999999"
        assert created_support.user_email == "aryarajmarketing@gmail.com"
        assert created_support.user_name == "Aryaraj Alves"
        assert created_support.session_id == "50"
        
        db.commit.assert_called_once()
