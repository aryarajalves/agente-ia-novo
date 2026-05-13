import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agent import process_message
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_initial_message_injection_bypass():
    # Configure agent with initial message
    config = AgentConfig(
        id=1,
        name="Test Agent",
        initial_message="Welcome! This is the initial message.",
        model="gpt-4o-mini",
        system_prompt="You are a test agent."
    )
    
    # Empty history
    history = []
    message = "Hello"
    
    # We don't expect OpenAI's completion endpoint to be called if history is empty and initial_message is set
    with patch("agent.get_openai_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.chat.completions.create = AsyncMock()

        result = await process_message(message, history, config)
        
        # Verify that create was NOT called
        mock_client.chat.completions.create.assert_not_called()
        
        # Verify result is the initial message
        assert result["content"] == "Welcome! This is the initial message."
        assert result["model"] == "static-response"

@pytest.mark.asyncio
async def test_no_initial_message_injection():
    # Configure agent WITHOUT initial message
    config = AgentConfig(
        id=1,
        name="Test Agent",
        initial_message=None,
        model="gpt-4o-mini"
    )
    
    history = []
    message = "Hello"
    
    with patch("agent.get_openai_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Hi!", tool_calls=None))]
        mock_response.usage = MagicMock(prompt_tokens=5, completion_tokens=5)
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        await process_message(message, history, config)
        
        args, kwargs = mock_client.chat.completions.create.call_args
        messages = kwargs["messages"]
        
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        assert len(assistant_messages) == 0, "Assistant message found when none was expected"
