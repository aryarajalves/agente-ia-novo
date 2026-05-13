import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agent import process_message
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_handoff_prompt_contains_urgency_instructions():
    # Setup a mock config with handoff enabled and a support tool
    config = AgentConfig(
        id=1,
        name="Test Agent",
        system_prompt="Você é um assistente útil.",
        model="gpt-4o-mini",
        handoff_enabled=True,
        knowledge_base_ids=[]
    )
    
    # Mock a tool that looks like a support tool (using "ajuda" keyword)
    support_tool = MagicMock()
    support_tool.name = "acionar_ajuda"
    support_tool.description = "Aciona um atendente real."
    support_tool.parameters_schema = '{"properties": {}, "required": []}'
    
    tools = [support_tool]
    
    # Mock get_required_handoff_variables to return some variables
    with patch("agent.get_required_handoff_variables", new_callable=AsyncMock) as mock_get_vars:
        mock_get_vars.return_value = [{"name": "nome", "description": "Nome do cliente"}]
        
        # We need to mock the OpenAI client to avoid actual API calls
        with patch("agent.get_openai_client") as mock_client_factory:
            mock_client = MagicMock()
            mock_client_factory.return_value = mock_client
            
            # process_message will try to call client.chat.completions.create
            mock_client.chat.completions.create = AsyncMock()
            
            await process_message(
                message="Quero falar com um humano agora!",
                history=[],
                config=config,
                tools=tools,
                db=AsyncMock()
            )
            
            # Verify the messages sent to the LLM
            args, kwargs = mock_client.chat.completions.create.call_args
            system_message = kwargs["messages"][0]["content"]
            
            # Check if the desired instructions are present
            assert "PROTOCOLO DE COLETA PRÉ-TRANSBORDO (OBRIGATÓRIO)" in system_message
            assert "Você **ESTÁ PROIBIDO** de acionar a ferramenta de suporte humano antes de coletar o **MOTIVO DETALHADO**" in system_message
            assert "ACIONAMENTO DO SUPORTE (fluxo direto)" in system_message
            
            # The handoff instruction should come AFTER the collection instruction
            assert system_message.find("ACIONAMENTO DO SUPORTE") > system_message.find("PROTOCOLO DE COLETA")

if __name__ == "__main__":
    pytest.main([__file__])
