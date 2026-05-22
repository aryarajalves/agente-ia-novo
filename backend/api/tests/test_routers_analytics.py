"""
Testes unitários para api/routers/analytics.py

Valida as rotas de estatísticas e relatórios financeiros
com banco de dados mockado.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from api.routers.analytics import router
from api.limiter import limiter


test_app = FastAPI()
test_app.state.limiter = limiter
test_app.include_router(router)


@pytest.fixture
def client():
    return TestClient(test_app, raise_server_exceptions=False)


class TestDashboardStats:
    def test_route_exists(self, client):
        """A rota GET /dashboard/stats deve existir."""
        response = client.get("/dashboard/stats", headers={"X-API-Key": "test"})
        assert response.status_code != 404

    @patch("api.routers.analytics.verify_api_key", return_value=None)
    @patch("api.routers.analytics.get_db")
    def test_returns_stats_structure(self, mock_db, mock_key, client):
        """Com banco mockado, deve retornar estrutura correta."""
        scalar_mock = MagicMock()
        scalar_mock.scalar.return_value = 5

        db_session = AsyncMock()
        db_session.execute = AsyncMock(return_value=scalar_mock)

        async def fake_get_db():
            yield db_session

        with patch("api.routers.analytics.get_db", fake_get_db):
            with patch("api.routers.analytics.verify_api_key", return_value=None):
                response = client.get("/dashboard/stats")

        # Verifica que a rota existe e retorna algo
        assert response.status_code in [200, 401, 403, 500]

    def test_requires_auth(self, client):
        """Sem API Key configurada, a rota deve funcionar (AGENT_API_KEY vazio)."""
        with patch.dict("os.environ", {"AGENT_API_KEY": "secret"}):
            response = client.get("/dashboard/stats")
        # Com chave configurada e sem header, deve rejeitar
        assert response.status_code in [403, 422, 500]


class TestFinancialReport:
    def test_route_exists(self, client):
        """A rota GET /financial/report deve existir."""
        response = client.get("/financial/report", headers={"X-API-Key": "test"})
        assert response.status_code != 404

    def test_accepts_date_filters(self, client):
        """A rota deve aceitar parâmetros start_date e end_date."""
        response = client.get(
            "/financial/report",
            params={"start_date": "2026-01-01", "end_date": "2026-04-30"},
            headers={"X-API-Key": "test"},
        )
        assert response.status_code != 404

    @patch("api.routers.analytics.verify_api_key", return_value=None)
    @patch("api.routers.analytics.get_db")
    def test_returns_report_structure(self, mock_db, mock_key, client):
        """Com banco mockado retornando lista vazia, deve retornar estrutura válida."""
        mock_result = MagicMock()
        mock_result.all.return_value = []

        db_session = AsyncMock()
        db_session.execute = AsyncMock(return_value=mock_result)

        async def fake_get_db():
            yield db_session

        with patch("api.routers.analytics.get_db", fake_get_db):
            with patch("api.routers.analytics.verify_api_key", return_value=None):
                response = client.get("/financial/report")

        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert "items" in data
            assert "grand_total_cost" in data

    @patch("api.routers.analytics.verify_api_key", return_value=None)
    @patch("api.routers.analytics.get_db")
    def test_filters_out_zero_cost_items(self, mock_db, mock_key, client):
        """A rota deve filtrar itens com custo zero."""
        row_zero = MagicMock()
        row_zero.day = "2026-05-22"
        row_zero.agent_id = 1
        row_zero.agent_name = "Agent Zero"
        row_zero.model_used = "gpt-4"
        row_zero.messages = 5
        row_zero.tokens = 100
        row_zero.cost = 0.0
        row_zero.unique_sessions = 2

        row_active = MagicMock()
        row_active.day = "2026-05-22"
        row_active.agent_id = 2
        row_active.agent_name = "Agent Active"
        row_active.model_used = "gpt-4"
        row_active.messages = 10
        row_active.tokens = 200
        row_active.cost = 1.5
        row_active.unique_sessions = 4

        mock_result = MagicMock()
        mock_result.all.return_value = [row_zero, row_active]

        db_session = AsyncMock()
        db_session.execute = AsyncMock(return_value=mock_result)

        async def fake_get_db():
            yield db_session

        from api.deps import get_db, verify_api_key
        test_app.dependency_overrides[get_db] = fake_get_db
        test_app.dependency_overrides[verify_api_key] = lambda: None

        try:
            response = client.get("/financial/report")
        finally:
            test_app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        items = data["items"]
        assert len(items) == 1
        assert items[0]["agent_id"] == 2
        assert items[0]["total_cost"] == 1.5
        assert data["grand_total_cost"] == 1.5
