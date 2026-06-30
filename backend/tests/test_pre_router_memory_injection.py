import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent_core.core import process_message
from config_store import AgentConfig

class MockMessage:
    def __init__(self, content):
        self.content = content
        self.tool_calls = None

class MockChoice:
    def __init__(self, content):
        self.message = MockMessage(content)

class MockResponse:
    def __init__(self, content):
        self.choices = [MockChoice(content)]
        self.usage = MagicMock(prompt_tokens=5, completion_tokens=5)

@pytest.fixture
def mock_config():
    return AgentConfig(
        id=1,
        name="Test Agent",
        system_prompt="You are a test agent.",
        model="gpt-4o-mini",
        router_enabled=False,
        date_awareness=False,
        handoff_enabled=False
    )

@pytest.mark.asyncio
async def test_process_message_uses_pre_router_memory(mock_config):
    message = "Hello"
    history = []
    
    # Simula o pre-router retornando resumo_memorias
    mock_pre_router_result = {
        "eh_saudacao": False,
        "id_agente_alvo": 1,
        "perguntas_extraidas": "Hello",
        "resumo_memorias": "Usuario gosta de cafe. Agente sugeriu expresso."
    }
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
         
        mock_pre_router.return_value = mock_pre_router_result
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Hi there!"))
        
        # Mock do DB session
        mock_db = MagicMock()
        
        # Executa a função passando o db e session_id
        await process_message(
            message=message,
            history=history,
            config=mock_config,
            context_variables={"session_id": "session_123"},
            db=mock_db
        )
        
        # Verifica se o OpenAI client foi chamado e o messages contém a memória injetada do pre-router
        mock_client.chat.completions.create.assert_called_once()
        called_args = mock_client.chat.completions.create.call_args[1]
        called_messages = called_args["messages"]
        
        # O segundo elemento (index 1) deve conter a memória injetada do pre-router
        assert any(
            "RESUMO DAS MEMÓRIAS DO USUÁRIO E AGENTE" in msg.get("content", "") and 
            "Usuario gosta de cafe. Agente sugeriu expresso." in msg.get("content", "")
            for msg in called_messages if isinstance(msg, dict) and msg.get("role") == "system"
        )

@pytest.mark.asyncio
async def test_process_message_uses_db_fallback_memory(mock_config):
    message = "Hello"
    history = []
    
    with patch("agent_core.core.get_openai_client") as mock_get_client, \
         patch("agent_core.core.run_pre_router_ai", new_callable=AsyncMock) as mock_pre_router:
         
        mock_pre_router.return_value = {
            "eh_saudacao": False,
            "id_agente_alvo": 1,
            "perguntas_extraidas": "Hello",
            "resumo_memorias": None
        }
        
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock(return_value=MockResponse("Hi there!"))
        
        # Usamos spec=AsyncSession para que isinstance(mock_db, AsyncSession) seja True
        from sqlalchemy.ext.asyncio import AsyncSession as RealAsyncSession
        mock_db = AsyncMock(spec=RealAsyncSession)
        mock_summary = MagicMock()
        mock_summary.summary_text = "Resumo persistido do banco."
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_summary
        mock_db.execute.return_value = mock_result
        
        await process_message(
            message=message,
            history=history,
            config=mock_config,
            context_variables={"session_id": "session_123"},
            db=mock_db
        )
        
        mock_client.chat.completions.create.assert_called_once()
        called_args = mock_client.chat.completions.create.call_args[1]
        called_messages = called_args["messages"]
        print("DEBUG CALLED MESSAGES:", called_messages)
        
        assert any(
            "RESUMO DAS MEMÓRIAS DO USUÁRIO E AGENTE (BANCO DE DADOS)" in msg.get("content", "") and 
            "Resumo persistido do banco." in msg.get("content", "")
            for msg in called_messages if isinstance(msg, dict) and msg.get("role") == "system"
        )

