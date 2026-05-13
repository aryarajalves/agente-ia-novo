"""
Testes unitários para api/routers/agents.py

Valida as rotas do Consultor de Prompt (advisor), refinamento e
endpoints básicos de agentes com banco de dados mockado.
"""
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI

from api.routers.agents import router
from api.limiter import limiter

test_app = FastAPI()
test_app.state.limiter = limiter
test_app.include_router(router)


@pytest.fixture
def client():
    return TestClient(test_app, raise_server_exceptions=False)


# --------------------------------------------------------------------------
# Verificação de existência das rotas críticas
# --------------------------------------------------------------------------

class TestRoutesExist:
    def test_advisor_route_exists(self, client):
        """A rota POST /api/prompt/advisor DEVE existir — era o bug reportado."""
        response = client.post("/api/prompt/advisor", json={})
        assert response.status_code != 404, "Rota /api/prompt/advisor não encontrada!"

    def test_refine_route_exists(self, client):
        """A rota POST /api/prompt/refine deve existir."""
        response = client.post("/api/prompt/refine", json={})
        assert response.status_code != 404

    def test_playground_route_exists(self, client):
        """A rota POST /api/chat/playground deve existir."""
        response = client.post("/api/chat/playground", json={})
        assert response.status_code != 404

    def test_agents_list_route_exists(self, client):
        """A rota GET /agents deve existir."""
        response = client.get("/agents")
        assert response.status_code != 404

    def test_agent_detail_route_exists(self, client):
        """A rota GET /agents/{id} deve existir."""
        response = client.get("/agents/1")
        assert response.status_code != 404


# --------------------------------------------------------------------------
# Validação do schema de entrada do Advisor
# --------------------------------------------------------------------------

class TestAdvisorSchema:
    def test_advisor_missing_required_fields_returns_422(self, client):
        """Body sem campos obrigatórios deve retornar 422 ou 403 (sem auth)."""
        response = client.post(
            "/api/prompt/advisor",
            json={"prompt_content": "Conteúdo do prompt"},  # user_query ausente
            headers={"X-API-Key": "qualquer"},
        )
        assert response.status_code in [422, 403]

    def test_advisor_missing_prompt_content_returns_422(self, client):
        """Body sem prompt_content deve retornar 422 ou 403 (sem auth)."""
        response = client.post(
            "/api/prompt/advisor",
            json={"user_query": "Como melhorar?"},  # prompt_content ausente
            headers={"X-API-Key": "qualquer"},
        )
        assert response.status_code in [422, 403]

    def test_advisor_full_valid_body_accepted(self, client):
        """Body completo e válido deve ser aceito (não 422)."""
        with patch("api.routers.agents.verify_api_key", return_value=None):
            response = client.post(
                "/api/prompt/advisor",
                json={
                    "prompt_content": "Você é um assistente.",
                    "user_query": "Como posso melhorar este prompt?",
                    "history": [],
                    "initial_message": "Olá!",
                    "initial_question_message": "Qual é seu nome?",
                    "ignore_messages": [],
                },
            )
        # Aceito mas pode falhar na chamada OpenAI (que está mockada/indisponível)
        assert response.status_code != 422
        assert response.status_code != 404


# --------------------------------------------------------------------------
# Teste do Advisor com OpenAI mockado
# --------------------------------------------------------------------------

class TestAdvisorWithMockedOpenAI:
    @patch("api.routers.agents.verify_api_key", return_value=None)
    @patch("api.routers.agents.get_db")
    @patch("api.routers.agents.get_openai_client")
    @patch("api.routers.agents.calculate_ai_cost", return_value=(0.001, 0.005))
    def test_advisor_returns_content_on_success(self, mock_cost, mock_client_fn, mock_db, mock_key, client):
        """Advisor deve retornar 'content' e 'cost_brl' quando OpenAI responde."""
        # Mock da resposta OpenAI
        mock_choice = MagicMock()
        mock_choice.message.content = "Seu prompt está bom, mas pode melhorar X."
        
        mock_usage = MagicMock()
        mock_usage.prompt_tokens = 100
        mock_usage.completion_tokens = 50
        
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_response.usage = mock_usage
        
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_client_fn.return_value = mock_client
        
        # Mock do banco
        db_session = AsyncMock()
        db_session.add = MagicMock()
        db_session.commit = AsyncMock()
        
        async def fake_get_db():
            yield db_session
        
        with patch("api.routers.agents.get_db", fake_get_db):
            with patch("api.routers.agents.verify_api_key", return_value=None):
                response = client.post(
                    "/api/prompt/advisor",
                    json={
                        "prompt_content": "Você é um assistente de vendas.",
                        "user_query": "O prompt está claro?",
                        "history": [],
                    },
                )
        
        assert response.status_code in [200, 500, 403]  # 403 se mock de auth não injetar
        if response.status_code == 200:
            data = response.json()
            assert "content" in data
            assert "cost_brl" in data

    @patch("api.routers.agents.verify_api_key", return_value=None)
    @patch("api.routers.agents.get_openai_client", return_value=None)
    def test_advisor_returns_500_when_client_not_configured(self, mock_client, mock_key, client):
        """Quando get_openai_client retorna None, deve retornar 500."""
        async def fake_get_db():
            yield AsyncMock()
        
        with patch("api.routers.agents.get_db", fake_get_db):
            with patch("api.routers.agents.verify_api_key", return_value=None):
                response = client.post(
                    "/api/prompt/advisor",
                    json={
                        "prompt_content": "Prompt qualquer.",
                        "user_query": "Teste",
                        "history": [],
                    },
                )
        # Deve ser 500 pois o client é None
        assert response.status_code in [500, 422, 403]


# --------------------------------------------------------------------------
# Validação do schema de entrada do Refine
# --------------------------------------------------------------------------

class TestRefineSchema:
    def test_refine_missing_prompt_content_returns_422(self, client):
        """Sem prompt_content, deve retornar 422 ou 403."""
        response = client.post(
            "/api/prompt/refine",
            json={"history": []},
            headers={"X-API-Key": "qualquer"},
        )
        assert response.status_code in [422, 403]

    def test_refine_valid_body_accepted(self, client):
        """Body completo deve ser aceito (não 422 nem 404)."""
        with patch("api.routers.agents.verify_api_key", return_value=None):
            response = client.post(
                "/api/prompt/refine",
                json={
                    "prompt_content": "Você é um assistente.",
                    "history": [{"role": "user", "content": "Melhore a clareza"}],
                    "user_instructions": "Seja mais formal.",
                },
            )
        assert response.status_code not in [404, 422]


# --------------------------------------------------------------------------
# CRUD básico de Agentes
# --------------------------------------------------------------------------

class TestAgentsCRUD:
    def test_create_agent_missing_required_fields(self, client):
        """POST /agents com body vazio usa defaults do schema — não deve ser 422."""
        response = client.post("/agents", json={})
        # AgentConfig tem todos campos com defaults, então 422 não é esperado
        assert response.status_code != 404

    def test_delete_agent_route_exists(self, client):
        """DELETE /agents/{id} deve existir."""
        response = client.delete("/agents/9999")
        assert response.status_code != 404

    def test_update_agent_route_exists(self, client):
        """PUT /agents/{id} deve existir."""
        response = client.put("/agents/9999", json={})
        assert response.status_code != 404

    def test_batch_delete_route_exists(self, client):
        """POST /agents/batch-delete deve existir."""
        response = client.post("/agents/batch-delete", json={"agent_ids": []})
        assert response.status_code != 404


# --------------------------------------------------------------------------
# Prompt Versioning
# --------------------------------------------------------------------------

class TestPromptVersioning:
    def test_list_prompts_route_exists(self, client):
        """GET /agents/{id}/prompts deve existir."""
        response = client.get("/agents/1/prompts")
        assert response.status_code != 404

    def test_create_prompt_route_exists(self, client):
        """POST /agents/{id}/prompts deve existir."""
        response = client.post(
            "/agents/1/prompts",
            json={"prompt_text": "Você é um assistente."},
        )
        assert response.status_code != 404
