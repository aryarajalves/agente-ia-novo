import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from agent import process_message
from config_store import AgentConfig
from models import WebhookConfigModel

@pytest.fixture
def mock_config():
    return AgentConfig(
        id=1,
        name="Test Agent",
        system_prompt="You are a test agent.",
        model="gpt-4o-mini",
        router_enabled=False,
        date_awareness=False,
        handoff_enabled=True
    )

@pytest.mark.asyncio
async def test_transferir_robo_automation(mock_config):
    message = "Pode voltar a me atender"
    history = []
    
    # Mocking the database session
    mock_db = AsyncMock()
    
    # Mocking WebhookConfigModel
    mock_webhook_config = MagicMock()
    mock_webhook_config.id = 10
    mock_webhook_config.leads_table = "leads_test"
    mock_webhook_config.chatwoot_url = "https://chatwoot.test"
    mock_webhook_config.chatwoot_api_token = "test_token"
    
    # Setup db.execute to return the config
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_webhook_config
    
    # Setup db.execute to return the config for the first call (select) and something else for update
    def db_execute_side_effect(query, *args, **kwargs):
        query_str = str(query)
        if "SELECT" in query_str.upper():
            return mock_result
        return MagicMock()

    mock_db.execute.side_effect = db_execute_side_effect

    # Define the tool
    mock_tool = MagicMock()
    mock_tool.name = "transferir_robo"
    mock_tool.description = "Transfer back to robot"
    mock_tool.labels_to_add = json.dumps(["bot_ativo"])
    mock_tool.labels_to_remove = json.dumps(["atendimento_humano"])
    mock_tool.webhook_url = None # System tool

    context_vars = {
        "webhook_config_id": "10",
        "contact_phone": "5511999999999",
        "account_id": "1",
        "conversation_id": "100"
    }

    with patch("agent.get_openai_client") as mock_get_client, \
         patch("agent.search_knowledge_base", new_callable=AsyncMock) as mock_rag, \
         patch("httpx.AsyncClient.get") as mock_get, \
         patch("httpx.AsyncClient.post") as mock_post:
        
        mock_rag.return_value = ([], [], False, "No RAG")
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Model calls the tool
        mock_call = MagicMock()
        mock_call.id = "call_transfer_robo"
        mock_call.function.name = "transferir_robo"
        mock_call.function.arguments = json.dumps({"conversation_id": 100, "account_id": 1, "contact_phone": "5511999999999"})
        
        mock_response_1 = MagicMock()
        mock_response_1.choices = [MagicMock(message=MagicMock(content=None, tool_calls=[mock_call]))]
        mock_response_1.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        
        mock_response_2 = MagicMock()
        mock_response_2.choices = [MagicMock(message=MagicMock(content="Ok, assumindo agora.", tool_calls=None))]
        mock_response_2.usage = MagicMock(prompt_tokens=10, completion_tokens=5)
        
        mock_client.chat.completions.create = AsyncMock(side_effect=[mock_response_1, mock_response_2])
        
        # Mocking HTTP responses
        # 1. GET current labels (existing labels)
        mock_get.return_value = MagicMock(
            status_code=200, 
            json=lambda: {"payload": ["label_antiga", "atendimento_humano"]}
        )
        
        # 2. POST final labels
        mock_post.return_value = MagicMock(status_code=200)
        
        result = await process_message(
            message, history, mock_config, 
            db=mock_db, tools=[mock_tool], context_variables=context_vars
        )
        
        # VERIFICATIONS
        
        # 2. Verify Label Update in Chatwoot (GET then POST)
        
        # Verify GET was called to fetch current labels
        get_labels_call = False
        for call in mock_get.call_args_list:
            args, kwargs = call
            url = args[0] if args else kwargs.get("url")
            if "api/v1/accounts/1/conversations/100/labels" in url:
                get_labels_call = True
        assert get_labels_call, "Chatwoot GET labels call not found"

        # Verify POST was called with merged labels
        # Final list should be: ["label_antiga", "bot_ativo"] 
        # Because "atendimento_humano" was in current_labels but also in labels_to_remove
        # and "bot_ativo" was in labels_to_add
        add_labels_call = False
        for call in mock_post.call_args_list:
            args, kwargs = call
            url = args[0] if args else kwargs.get("url")
            if "api/v1/accounts/1/conversations/100/labels" in url:
                sent_labels = kwargs["json"]["labels"]
                assert "bot_ativo" in sent_labels
                assert "label_antiga" in sent_labels
                assert "atendimento_humano" not in sent_labels
                add_labels_call = True
        assert add_labels_call, "Chatwoot POST labels call with merged list not found"

        # 3. Verify performed_tool_calls (Raio-X Logs)
        logs = result["debug"]["tool_calls"]
        names = [l["name"] for l in logs]
        assert "transferir_robo" in names
        assert "chatwoot:sincronizacao_etiquetas" in names
