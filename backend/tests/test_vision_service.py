import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from vision_service import analyze_image

@pytest.mark.asyncio
async def test_analyze_image_success():
    """Testa se a análise de imagem retorna a descrição correta simulando a API."""
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="Uma imagem de teste com texto OCR."))]
    
    with patch("vision_service.AsyncOpenAI") as mock_openai:
        mock_client = mock_openai.return_value
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Mock do download da imagem
        with patch("vision_service._download_image_as_base64") as mock_download:
            mock_download.return_value = "base64content"
            
            result = await analyze_image("http://example.com/test.jpg")
            
            assert result["description"] == "Uma imagem de teste com texto OCR."
            assert result["model"] == "gpt-4o"
            mock_client.chat.completions.create.assert_called_once()

@pytest.mark.asyncio
async def test_analyze_image_failure():
    """Testa o comportamento em caso de erro na API."""
    with patch("vision_service.AsyncOpenAI") as mock_openai:
        mock_client = mock_openai.return_value
        mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API Error"))
        
        with patch("vision_service._download_image_as_base64") as mock_download:
            mock_download.return_value = "base64content"
            
            with pytest.raises(Exception) as excinfo:
                await analyze_image("http://example.com/test.jpg")
            
            assert "API Error" in str(excinfo.value)
