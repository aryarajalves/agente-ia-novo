import sys
from unittest.mock import MagicMock, patch

# Mock all external dependencies before they are imported
mock_openai = MagicMock()
sys.modules["openai"] = mock_openai
sys.modules["tiktoken"] = MagicMock()
sys.modules["sqlalchemy"] = MagicMock()
sys.modules["sqlalchemy.ext.asyncio"] = MagicMock()
sys.modules["database"] = MagicMock()
sys.modules["models"] = MagicMock()
sys.modules["s3_service"] = MagicMock()

import asyncio
import pytest
from agent import process_message
from config_store import AgentConfig

@pytest.mark.asyncio
async def test_vision_payload():
    # Mock config
    config = AgentConfig(
        id=1,
        name="Test Vision",
        model="gpt-4o",
        system_prompt="You are a helpful assistant.",
        context_window=10
    )
    
    # Test message with image
    message = "What is in this image?"
    image_url = "http://localhost:8000/uploads/test.png"
    
    # Mock the openai client and other calls
    with patch('agent.get_openai_client') as mock_get_client, \
         patch('agent.calculate_coverage') as mock_calc_coverage:
        
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_calc_coverage.return_value = (None, 0, [])
        
        # Mocking the response structure
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="I see a test image.", tool_calls=None))]
        mock_response.usage = MagicMock(prompt_tokens=10, completion_tokens=10)
        mock_response.model = "gpt-4o"
        
        # chat.completions.create is an async call in some versions, but here mocked as sync? 
        # Actually it's an OpenAI client, so let's make it an AsyncMock if needed.
        from unittest.mock import AsyncMock
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await process_message(
            message=message,
            history=[],
            config=config,
            image_url=image_url
        )
        
        # Verify the client was called with the correct payload
        args, kwargs = mock_client.chat.completions.create.call_args
        sent_messages = kwargs['messages']
        
        # Last message should be the user message with image_url
        user_msg = sent_messages[-1]
        assert user_msg['role'] == 'user'
        assert isinstance(user_msg['content'], list)
        assert user_msg['content'][0]['text'] == message
        assert user_msg['content'][1]['image_url']['url'] == image_url
        
        print("✅ Vision payload verification passed!")

if __name__ == "__main__":
    try:
        asyncio.run(test_vision_payload())
    except Exception as e:
        import traceback
        traceback.print_exc()
        exit(1)
