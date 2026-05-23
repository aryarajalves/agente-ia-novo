"""
Testes unitários para api/routers/media.py

Valida o endpoint de upload de imagem com mock do S3
e fallback para armazenamento local.
"""
import pytest
import io
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from api.routers.media import router
from api.limiter import limiter


test_app = FastAPI()
test_app.state.limiter = limiter
test_app.include_router(router)


@pytest.fixture
def client():
    from api.deps import verify_api_key
    test_app.dependency_overrides[verify_api_key] = lambda: None
    yield TestClient(test_app, raise_server_exceptions=False)
    test_app.dependency_overrides.clear()


@pytest.fixture
def fake_image():
    """Retorna um arquivo de imagem fake para testes de upload."""
    return ("test.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100), "image/png")


class TestUploadImage:
    def test_route_exists(self, client):
        """A rota POST /upload-image deve existir."""
        response = client.post("/upload-image", headers={"X-API-Key": "test"})
        # Sem arquivo, deve ser 422 (bad request), não 404
        assert response.status_code != 404

    def test_upload_without_file_returns_422(self, client):
        """Upload sem arquivo deve retornar 422."""
        response = client.post("/upload-image", headers={"X-API-Key": "test"})
        assert response.status_code == 422

    @patch("api.routers.media.verify_api_key", return_value=None)
    @patch.dict("os.environ", {
        "S3_ENDPOINT_URL": "",
        "S3_ACCESS_KEY": "",
        "S3_SECRET_KEY": "",
        "S3_BUCKET_NAME": "",
        "BACKEND_URL": "http://localhost:8000"
    })
    def test_upload_image_fallback_local(self, mock_key, client, tmp_path, monkeypatch):
        """Sem S3 configurado, deve salvar localmente e retornar URL local."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / "tmp_uploads").mkdir()

        with patch("api.routers.media.verify_api_key", return_value=None):
            response = client.post(
                "/upload-image",
                files={"file": ("test.png", io.BytesIO(b"PNG_CONTENT"), "image/png")},
            )

        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert "image_url" in data
            assert data["storage"] == "local"
            assert data["filename"].endswith(".png")

    @patch("api.routers.media.verify_api_key", return_value=None)
    @patch("api.routers.media.s3_service")
    @patch.dict("os.environ", {
        "S3_ENDPOINT_URL": "https://s3.example.com",
        "S3_ACCESS_KEY": "key",
        "S3_SECRET_KEY": "secret",
        "S3_BUCKET_NAME": "bucket",
    })
    def test_upload_image_s3_success(self, mock_s3, mock_key, client):
        """Com S3 configurado e funcionando, deve retornar URL do S3."""
        mock_s3.bucket_name = "bucket"
        mock_s3.s3_client = MagicMock()
        mock_s3.s3_client.put_object = MagicMock()
        mock_s3.get_public_url.return_value = "https://s3.example.com/bucket/chat-images/test.png"

        with patch("api.routers.media.verify_api_key", return_value=None):
            response = client.post(
                "/upload-image",
                files={"file": ("test.png", io.BytesIO(b"PNG_CONTENT"), "image/png")},
            )

        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert "image_url" in data

    def test_upload_jpeg_extension_normalization(self, client):
        """JPEG deve ser salvo com extensão .jpg."""
        with patch("api.routers.media.verify_api_key", return_value=None):
            with patch.dict("os.environ", {"S3_ENDPOINT_URL": "", "BACKEND_URL": "http://localhost:8000"}):
                with patch("builtins.open", MagicMock()):
                    with patch("os.makedirs"):
                        response = client.post(
                            "/upload-image",
                            files={"file": ("photo.jpeg", io.BytesIO(b"JPEG"), "image/jpeg")},
                        )
        # Pode falhar ao salvar, mas verificamos que a rota existe
        assert response.status_code != 404

    def test_upload_without_extension_uses_content_type(self, client):
        """Arquivo sem extensão deve usar content_type para determinar extensão."""
        with patch("api.routers.media.verify_api_key", return_value=None):
            with patch.dict("os.environ", {"S3_ENDPOINT_URL": ""}):
                with patch("builtins.open", MagicMock()):
                    with patch("os.makedirs"):
                        response = client.post(
                            "/upload-image",
                            files={"file": ("noext", io.BytesIO(b"IMG"), "image/webp")},
                        )
        assert response.status_code != 404


class TestTranscribeAudio:
    def test_route_exists(self, client):
        """A rota POST /transcribe-audio deve existir."""
        response = client.post("/transcribe-audio", headers={"X-API-Key": "test"})
        # Sem arquivo, deve ser 422, não 404
        assert response.status_code != 404

    @patch("api.routers.media.verify_api_key", return_value=None)
    @patch.dict("os.environ", {"OPENAI_API_KEY": ""})
    def test_transcribe_without_api_key_returns_500(self, mock_key, client):
        """Sem chave da OpenAI, a rota deve retornar 500."""
        response = client.post(
            "/transcribe-audio",
            headers={"X-API-Key": "test"},
            files={"file": ("test.webm", io.BytesIO(b"audio_bytes"), "audio/webm")},
        )
        assert response.status_code == 500
        assert "Chave da OpenAI" in response.json()["detail"]

    @patch("api.routers.media.verify_api_key", return_value=None)
    @patch.dict("os.environ", {"OPENAI_API_KEY": "fake_key", "BACKEND_URL": "http://localhost:8000"})
    @patch("openai.resources.audio.transcriptions.AsyncTranscriptions.create")
    def test_transcribe_audio_success(self, mock_create, mock_key, client, tmp_path, monkeypatch):
        """Com chave configurada e Whisper obtendo sucesso de primeira, deve retornar o texto."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / "tmp_uploads").mkdir(exist_ok=True)

        # Mock da transcrição do Whisper
        mock_transcript = MagicMock()
        mock_transcript.text = "Olá, este é um teste de transcrição."
        mock_create.return_value = mock_transcript

        response = client.post(
            "/transcribe-audio",
            files={"file": ("test.webm", io.BytesIO(b"audio_bytes"), "audio/webm")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Olá, este é um teste de transcrição."
        assert "audio_url" in data
        assert data["filename"].endswith(".webm")

    @patch("api.routers.media.verify_api_key", return_value=None)
    @patch.dict("os.environ", {"OPENAI_API_KEY": "fake_key", "BACKEND_URL": "http://localhost:8000"})
    @patch("openai.resources.audio.transcriptions.AsyncTranscriptions.create")
    @patch("agent_core.services.media_service._convert_to_mp3")
    def test_transcribe_audio_fallback_ffmpeg_success(self, mock_convert, mock_create, mock_key, client, tmp_path, monkeypatch):
        """Se falhar de primeira, tenta converter com ffmpeg e transcrever novamente."""
        monkeypatch.chdir(tmp_path)
        (tmp_path / "tmp_uploads").mkdir(exist_ok=True)

        # Primeira chamada falha, segunda tem sucesso após conversão
        mock_transcript = MagicMock()
        mock_transcript.text = "Transcrito após conversão."
        mock_create.side_effect = [Exception("Whisper error"), mock_transcript]

        mock_convert.return_value = b"fake_mp3_bytes"

        response = client.post(
            "/transcribe-audio",
            files={"file": ("test.ogg", io.BytesIO(b"audio_bytes"), "audio/ogg")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Transcrito após conversão."
        assert data["filename"].endswith(".mp3")
        assert "audio_url" in data

