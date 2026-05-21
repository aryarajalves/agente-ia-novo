import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from agent_core.services.media_service import process_media_content, is_conversational_hallucination
import base64

def test_is_conversational_hallucination():
    # Deve detectar alucinações conversacionais
    assert is_conversational_hallucination("Claro, compartilhe o áudio.") == True
    assert is_conversational_hallucination("Como posso ajudar você hoje?") == True
    assert is_conversational_hallucination("Por favor, envie o arquivo de áudio.") == True
    
    # Não deve considerar falas normais do usuário como alucinação
    assert is_conversational_hallucination("Olá, tudo bem?") == False
    assert is_conversational_hallucination("Eu preciso de suporte técnico.") == False

@pytest.mark.asyncio
async def test_process_media_content_audio_success_whisper():
    mock_media_data = b"fake_audio_data"
    mock_api_key = "sk-test-key"
    mock_url = "http://example.com/audio.ogg"
    
    with patch("httpx.AsyncClient") as mock_http_client_class:
        mock_http_client = mock_http_client_class.return_value.__aenter__.return_value
        mock_http_client.get.return_value = MagicMock(status_code=200, content=mock_media_data)
        
        with patch("agent_core.services.media_service.AsyncOpenAI") as mock_openai_class:
            mock_client = mock_openai_class.return_value
            
            # Whisper obtém sucesso
            mock_transcript = MagicMock()
            mock_transcript.text = "Transcrição via Whisper Principal"
            mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_transcript)
            
            with patch("agent_core.services.media_service._convert_to_mp3", return_value=b"converted_data") as mock_conv:
                result = await process_media_content(mock_url, "audio", mock_api_key)
                
                assert result["text"] == "Transcrição via Whisper Principal"
                assert result["model"] == "whisper-1"
                mock_conv.assert_called_once_with(mock_media_data)
                mock_client.audio.transcriptions.create.assert_called_once()
                
                # Garante que gpt-audio NÃO foi acionado
                mock_client.chat.completions.create.assert_not_called()

@pytest.mark.asyncio
async def test_process_media_content_audio_fallback_gpt_audio():
    mock_media_data = b"fake_audio_data"
    mock_api_key = "sk-test-key"
    mock_url = "http://example.com/audio.ogg"
    
    with patch("httpx.AsyncClient") as mock_http_client_class:
        mock_http_client = mock_http_client_class.return_value.__aenter__.return_value
        mock_http_client.get.return_value = MagicMock(status_code=200, content=mock_media_data)
        
        with patch("agent_core.services.media_service.AsyncOpenAI") as mock_openai_class:
            mock_client = mock_openai_class.return_value
            
            # Whisper falha
            mock_client.audio.transcriptions.create = AsyncMock(side_effect=Exception("Whisper offline"))
            
            # GPT-Audio obtém sucesso com transcrição válida (não-conversacional)
            mock_response = MagicMock()
            mock_response.choices = [MagicMock(message=MagicMock(content="Transcrição do GPT Audio"))]
            mock_response.usage = MagicMock()
            mock_response.usage.to_dict.return_value = {"total_tokens": 30}
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            with patch("agent_core.services.media_service._convert_to_mp3", return_value=b"converted_data"):
                result = await process_media_content(mock_url, "audio", mock_api_key)
                
                assert result["text"] == "Transcrição do GPT Audio"
                assert result["model"] == "gpt-audio"
                
                # Ambas APIs devem ter sido chamadas
                mock_client.audio.transcriptions.create.assert_called_once()
                mock_client.chat.completions.create.assert_called_once()
                
                # Valida que o prompt de sistema foi fornecido
                args, kwargs = mock_client.chat.completions.create.call_args
                assert kwargs["model"] == "gpt-audio"
                assert kwargs["messages"][0]["role"] == "system"
                assert "Você é um transcritor automático" in kwargs["messages"][0]["content"]

@pytest.mark.asyncio
async def test_process_media_content_audio_gpt_audio_hallucination_discarded():
    mock_media_data = b"fake_audio_data"
    mock_api_key = "sk-test-key"
    mock_url = "http://example.com/audio.ogg"
    
    with patch("httpx.AsyncClient") as mock_http_client_class:
        mock_http_client = mock_http_client_class.return_value.__aenter__.return_value
        mock_http_client.get.return_value = MagicMock(status_code=200, content=mock_media_data)
        
        with patch("agent_core.services.media_service.AsyncOpenAI") as mock_openai_class:
            mock_client = mock_openai_class.return_value
            
            # Whisper falha
            mock_client.audio.transcriptions.create = AsyncMock(side_effect=Exception("Whisper offline"))
            
            # GPT-Audio responde com alucinação conversacional
            mock_response = MagicMock()
            mock_response.choices = [MagicMock(message=MagicMock(content="Claro! Envie o arquivo de áudio para eu transcrever."))]
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            with patch("agent_core.services.media_service._convert_to_mp3", return_value=b"converted_data"):
                result = await process_media_content(mock_url, "audio", mock_api_key)
                
                # Deve descartar o resultado e retornar erro, pois o filtro detectou alucinação conversacional
                assert "error" in result
                assert "Erro na transcrição de áudio" in result["error"]
                assert result["text"] == ""

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
