"""
Testes unitários para o endpoint /chatwoot/labels
que agora busca etiquetas do ZapVoice em vez do Chatwoot.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
from models import WebhookConfigModel


def _make_mock_httpx_client(status_code, response_data, headers_capture=None):
    """Cria um mock de AsyncClient com context manager suportado."""
    mock_response = MagicMock()
    mock_response.status_code = status_code
    mock_response.json.return_value = response_data
    mock_response.text = str(response_data)

    async def mock_get(url, headers=None, timeout=None):
        if headers_capture is not None:
            headers_capture.update(headers or {})
        return mock_response

    mock_client_instance = AsyncMock()
    mock_client_instance.get = AsyncMock(side_effect=mock_get)
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)
    return mock_client_instance


@pytest.mark.asyncio
async def test_get_labels_returns_empty_when_no_env(client, monkeypatch):
    """Testa que o endpoint retorna [] quando ZAPVOICE_URL e ZAPVOICE_API_TOKEN não estão configurados."""
    monkeypatch.setenv("ZAPVOICE_URL", "")
    monkeypatch.setenv("ZAPVOICE_API_TOKEN", "")
    monkeypatch.setenv("AGENT_API_KEY", "test-secret-key")

    response = await client.get(
        "/chatwoot/labels",
        headers={"X-API-Key": "test-secret-key"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_get_labels_returns_zapvoice_labels(client, db_session, monkeypatch):
    """Testa que o endpoint retorna as etiquetas do ZapVoice corretamente."""
    monkeypatch.setenv("ZAPVOICE_URL", "https://mock.zapvoice.com")
    monkeypatch.setenv("ZAPVOICE_API_TOKEN", "zv_live_test_token")
    monkeypatch.setenv("AGENT_API_KEY", "test-secret-key")

    # Criar webhook com zapvoice_client_id configurado
    config = WebhookConfigModel(
        name="Webhook ZapVoice Labels Test",
        token="token-labels-test-v2",
        leads_table="leads",
        is_active=True,
        zapvoice_client_id="5"
    )
    db_session.add(config)
    await db_session.commit()

    mock_client = _make_mock_httpx_client(200, ["suporte", "vendas", "urgente", "robo"])

    with patch("httpx.AsyncClient", return_value=mock_client):
        response = await client.get(
            "/chatwoot/labels",
            headers={"X-API-Key": "test-secret-key"}
        )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "suporte" in data
    assert "vendas" in data
    assert "urgente" in data


@pytest.mark.asyncio
async def test_get_labels_handles_zapvoice_500(client, monkeypatch):
    """Testa que o endpoint retorna [] quando o ZapVoice responde 500."""
    monkeypatch.setenv("ZAPVOICE_URL", "https://mock.zapvoice.com")
    monkeypatch.setenv("ZAPVOICE_API_TOKEN", "zv_live_test_token")
    monkeypatch.setenv("AGENT_API_KEY", "test-secret-key")

    mock_client = _make_mock_httpx_client(500, {"error": "Internal Server Error"})

    with patch("httpx.AsyncClient", return_value=mock_client):
        response = await client.get(
            "/chatwoot/labels",
            headers={"X-API-Key": "test-secret-key"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_get_labels_handles_zapvoice_connection_error(client, monkeypatch):
    """Testa que o endpoint retorna [] quando não consegue conectar ao ZapVoice."""
    monkeypatch.setenv("ZAPVOICE_URL", "https://mock.zapvoice.com")
    monkeypatch.setenv("ZAPVOICE_API_TOKEN", "zv_live_test_token")
    monkeypatch.setenv("AGENT_API_KEY", "test-secret-key")

    mock_client_instance = AsyncMock()
    mock_client_instance.get = AsyncMock(side_effect=Exception("Connection refused"))
    mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
    mock_client_instance.__aexit__ = AsyncMock(return_value=False)

    with patch("httpx.AsyncClient", return_value=mock_client_instance):
        response = await client.get(
            "/chatwoot/labels",
            headers={"X-API-Key": "test-secret-key"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_get_labels_passes_client_id_header(client, db_session, monkeypatch):
    """Testa que o client_id do webhook é enviado como X-Client-ID para o ZapVoice."""
    monkeypatch.setenv("ZAPVOICE_URL", "https://mock.zapvoice.com")
    monkeypatch.setenv("ZAPVOICE_API_TOKEN", "zv_live_test_token")
    monkeypatch.setenv("AGENT_API_KEY", "test-secret-key")

    config = WebhookConfigModel(
        name="Webhook Labels Header Test",
        token="token-header-test-v2",
        leads_table="leads",
        is_active=True,
        zapvoice_client_id="99"
    )
    db_session.add(config)
    await db_session.commit()

    captured_headers = {}
    mock_client = _make_mock_httpx_client(200, ["etiqueta1"], headers_capture=captured_headers)

    with patch("httpx.AsyncClient", return_value=mock_client):
        response = await client.get(
            "/chatwoot/labels",
            headers={"X-API-Key": "test-secret-key"}
        )

    assert response.status_code == 200
    # Verificar que o X-Client-ID foi passado para o ZapVoice
    assert "X-Client-ID" in captured_headers, f"Headers capturados: {captured_headers}"
    assert "Authorization" in captured_headers
    assert captured_headers["Authorization"].startswith("Bearer ")
    # Verificar que o client_id correto foi usado
    assert captured_headers["X-Client-ID"] == "99"
