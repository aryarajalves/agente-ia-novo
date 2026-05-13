import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from agent_core.services.media_service import process_media_content
import base64

@pytest.mark.asyncio
async def test_process_media_content_audio_success():
    # Mocks
    mock_media_data = b"fake_audio_data"
    mock_api_key = "sk-test-key"
    mock_url = "http://example.com/audio.ogg"
    
    # Mock do httpx para o download
    with patch("httpx.AsyncClient") as mock_http_client_class:
        mock_http_client = mock_http_client_class.return_value.__aenter__.return_value
        mock_http_client.get.return_value = MagicMock(status_code=200, content=mock_media_data)
        
        # Mock do AsyncOpenAI
        with patch("agent_core.services.media_service.AsyncOpenAI") as mock_openai_class:
            mock_client = mock_openai_class.return_value
            mock_response = MagicMock()
            mock_response.choices = [MagicMock(message=MagicMock(content="Transcrição Premium"))]
            mock_response.usage = MagicMock()
            mock_response.usage.to_dict.return_value = {"total_tokens": 50}
            
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            # Mock da conversão (para não precisar de ffmpeg real no teste unitário básico)
            with patch("agent_core.services.media_service._convert_to_mp3", return_value=b"converted_data") as mock_conv:
                # Executar a função
                result = await process_media_content(mock_url, "audio", mock_api_key)
                
                # Verificações
                assert result["text"] == "Transcrição Premium"
                assert result["model"] == "gpt-4o-audio-preview"
                mock_conv.assert_called_once_with(mock_media_data)
                
                # Verificar a estrutura da chamada
                args, kwargs = mock_client.chat.completions.create.call_args
                assert kwargs["model"] == "gpt-4o-audio-preview"
                assert kwargs["modalities"] == ["text"]
                
                # Verificar se o áudio convertido está lá
                messages = kwargs["messages"]
                input_audio = messages[0]["content"][1]["input_audio"]
                assert input_audio["format"] == "mp3"
                assert input_audio["data"] == base64.b64encode(b"converted_data").decode('utf-8')

@pytest.mark.asyncio
async def test_process_media_content_conversion_error():
    mock_media_data = b"bad_data"
    with patch("httpx.AsyncClient") as mock_http_client_class:
        mock_http_client = mock_http_client_class.return_value.__aenter__.return_value
        mock_http_client.get.return_value = MagicMock(status_code=200, content=mock_media_data)
        
        with patch("agent_core.services.media_service._convert_to_mp3", side_effect=Exception("ffmpeg error")):
            result = await process_media_content("http://test.com/a.ogg", "audio", "key")
            assert "Erro ao processar áudio: ffmpeg error" in result["error"]

@pytest.mark.asyncio
async def test_process_media_content_download_error():
    with patch("httpx.AsyncClient") as mock_http_client_class:
        mock_http_client = mock_http_client_class.return_value.__aenter__.return_value
        mock_http_client.get.return_value = MagicMock(status_code=404)
        
        result = await process_media_content("http://error.com", "audio", "key")
        assert "Erro ao baixar mídia: 404" in result["error"]
