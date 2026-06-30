import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from models import AgentConfigModel, InteractionLog, UserQuestionEmbedding, ObjectionCluster, ObjectionClusterMessage
from datetime import datetime, timezone, timedelta

@pytest.mark.asyncio
async def test_get_objections_empty(client: AsyncClient, db_session):
    # Setup: Criar um agente de teste
    agent = AgentConfigModel(name="Agent Objections Test 1", model="gpt-4o-mini")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    # Executar a busca de objeções (vazio)
    response = await client.get(f"/analytics/objections?agent_id={agent.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["agent_id"] == agent.id
    assert data["total_clusters"] == 0
    assert len(data["clusters"]) == 0

@pytest.mark.asyncio
@patch("api.routers.objections.get_batch_embeddings")
@patch("api.routers.objections.AsyncOpenAI")
async def test_recalculate_objections(mock_openai, mock_embeddings, client: AsyncClient, db_session):
    # Criar vetores de 1536 dimensões normais para simular a similaridade de cosseno
    # v1 e v2 são quase idênticos (similaridade próxima de 1)
    # v3 é oposto/diferente
    v1 = [0.1] * 1536
    v2 = [0.101] * 1536
    v3 = [-0.1] * 1536

    mock_embeddings.return_value = ([v1, v2, v3], 100)

    # Mock OpenAI client
    mock_client_instance = AsyncMock()
    mock_openai.return_value = mock_client_instance
    
    mock_response = AsyncMock()
    mock_response.choices = [
        AsyncMock(message=AsyncMock(content='{"category_name": "Preços e Custos", "suggested_script": "O nosso produto custa apenas R$ 97 por mês."}'))
    ]
    mock_client_instance.chat.completions.create.return_value = mock_response

    # Setup: Criar agente e logs
    agent = AgentConfigModel(name="Agent Objections Test 2", model="gpt-4o-mini")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    log1 = InteractionLog(agent_id=agent.id, session_id="session1", user_message="Quanto custa o serviço?", agent_response="Olá")
    log2 = InteractionLog(agent_id=agent.id, session_id="session2", user_message="Qual o valor da assinatura?", agent_response="Olá")
    log3 = InteractionLog(agent_id=agent.id, session_id="session3", user_message="Como eu posso me cadastrar?", agent_response="Olá")
    db_session.add_all([log1, log2, log3])
    await db_session.commit()

    # Executar recálculo
    response = await client.post(f"/analytics/objections/recalculate?agent_id={agent.id}")
    assert response.status_code == 200
    data = response.json()

    assert data["agent_id"] == agent.id
    assert data["total_clusters"] == 1 # 1 cluster contendo 2 mensagens (Quanto custa + Qual o valor)
    cluster = data["clusters"][0]
    assert cluster["category_name"] == "Preços e Custos"
    assert cluster["count"] == 2
    assert "Quanto custa o serviço?" in cluster["examples"] or "Qual o valor da assinatura?" in cluster["examples"]

@pytest.mark.asyncio
async def test_recalculate_rate_limit(client: AsyncClient, db_session):
    # Setup: Criar agente e um cluster simulando que foi atualizado a 2 minutos
    agent = AgentConfigModel(name="Agent Objections Test 3", model="gpt-4o-mini")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    recent_time = datetime.now(timezone.utc) - timedelta(minutes=2)
    cluster = ObjectionCluster(
        agent_id=agent.id,
        cluster_label="Categoria Cacheada",
        representative_question="Dúvida representativa",
        suggested_script="Script cacheado",
        count=5,
        updated_at=recent_time
    )
    db_session.add(cluster)
    await db_session.commit()

    # Executar recálculo - Deve acionar a trava e retornar o cache
    response = await client.post(f"/analytics/objections/recalculate?agent_id={agent.id}")
    assert response.status_code == 200
    data = response.json()

    assert "Ranking atualizado recentemente" in data.get("message", "")
    assert data["total_clusters"] == 1
    assert data["clusters"][0]["category_name"] == "Categoria Cacheada"
