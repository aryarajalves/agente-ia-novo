import pytest
from httpx import AsyncClient
from sqlalchemy import select
from models import UnansweredQuestionModel, GlobalContextVariableModel, KnowledgeBaseModel, KnowledgeItemModel

@pytest.mark.asyncio
async def test_unanswered_questions_flow(client: AsyncClient, db_session):
    # 0. Create an agent
    from models import AgentConfigModel
    agent = AgentConfigModel(name="Test Agent", description="Test")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    # 1. Create a mock unanswered question
    q = UnansweredQuestionModel(
        question="Qual o sentido da vida?",
        agent_id=agent.id,
        session_id="SESS_TEST",
        status="PENDENTE"
    )
    db_session.add(q)
    await db_session.commit()
    await db_session.refresh(q)

    # 2. List unanswered
    response = await client.get("/unanswered-questions")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    items = data["items"]
    assert len(items) >= 1
    assert any(item["id"] == q.id for item in items)

    # 3. Create a Knowledge Base for answering
    kb = KnowledgeBaseModel(name="FAQ", description="FAQ Base")
    db_session.add(kb)
    await db_session.commit()
    await db_session.refresh(kb)

    # 4. Answer the question
    payload = {
        "answer": "42",
        "knowledge_base_id": kb.id
    }
    response = await client.post(f"/unanswered-questions/{q.id}/answer", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 5. Verify status and knowledge item
    await db_session.refresh(q)
    assert q.status == "RESPONDIDA"
    
    stmt = select(KnowledgeItemModel).where(KnowledgeItemModel.knowledge_base_id == kb.id)
    res = await db_session.execute(stmt)
    kb_item = res.scalars().first()
    assert kb_item is not None
    assert kb_item.answer == "42"

    # 6. Discard another question
    q2 = UnansweredQuestionModel(
        question="Ignore me",
        status="PENDENTE"
    )
    db_session.add(q2)
    await db_session.commit()
    await db_session.refresh(q2)
    
    response = await client.post(f"/unanswered-questions/{q2.id}/discard")
    assert response.status_code == 200
    await db_session.refresh(q2)
    assert q2.status == "DESCARTADA"

@pytest.mark.asyncio
async def test_global_context_variables_crud(client: AsyncClient, db_session):
    # 1. Create
    payload = {
        "key": "TEST_VAR",
        "value": "Hello",
        "description": "A test variable"
    }
    response = await client.post("/global-variables", json=payload)
    assert response.status_code == 200
    var_id = response.json()["id"]

    # 2. List
    response = await client.get("/global-variables")
    assert response.status_code == 200
    data = response.json()
    assert any(v["key"] == "TEST_VAR" for v in data)

    # 3. Update
    payload = {
        "key": "TEST_VAR_UPDATED",
        "value": "World",
        "description": "Updated description"
    }
    response = await client.put(f"/global-variables/{var_id}", json=payload)
    assert response.status_code == 200
    assert response.json()["value"] == "World"

    # 4. Delete
    response = await client.delete(f"/global-variables/{var_id}")
    assert response.status_code == 200
    
    # Verify deletion
    stmt = select(GlobalContextVariableModel).where(GlobalContextVariableModel.id == var_id)
    res = await db_session.execute(stmt)
    assert res.scalars().first() is None

@pytest.mark.asyncio
async def test_unanswered_questions_pagination_and_bulk_discard(client: AsyncClient, db_session):
    # 1. Create multiple mock unanswered questions
    q_list = []
    for i in range(5):
        q = UnansweredQuestionModel(
            question=f"Dúvida número {i}",
            session_id=f"551199999000{i}",
            status="PENDENTE"
        )
        db_session.add(q)
        q_list.append(q)
    await db_session.commit()
    for q in q_list:
        await db_session.refresh(q)

    # 2. Test pagination - page 1 with limit=2
    response = await client.get("/unanswered-questions?limit=2&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total"] >= 5
    assert len(data["items"]) == 2

    # 3. Test pagination - page 2 with limit=2
    response2 = await client.get("/unanswered-questions?limit=2&offset=2")
    assert response2.status_code == 200
    data2 = response2.json()
    assert len(data2["items"]) == 2
    # Ensure items are different
    ids1 = {item["id"] for item in data["items"]}
    ids2 = {item["id"] for item in data2["items"]}
    assert ids1.isdisjoint(ids2)

    # 4. Test bulk discard
    target_ids = [q_list[0].id, q_list[1].id]
    bulk_response = await client.post("/unanswered-questions/bulk-discard", json={"ids": target_ids})
    assert bulk_response.status_code == 200
    assert bulk_response.json()["success"] is True

    # 5. Verify status is DESCARTADA
    for q_id in target_ids:
        db_q = await db_session.get(UnansweredQuestionModel, q_id)
        assert db_q.status == "DESCARTADA"

@pytest.mark.asyncio
async def test_unanswered_questions_phone_enrichment_from_leads_table(client: AsyncClient, db_session):
    from webhooks.service import ensure_leads_table
    from sqlalchemy import text
    
    # 1. Garante que a tabela leads de teste existe
    await ensure_leads_table("leads")
    
    # 2. Cria um agente mock
    from models import AgentConfigModel
    agent = AgentConfigModel(name="Agent Lead Test", description="Test Description")
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)
    
    # 3. Insere um lead de teste no banco
    lead_id = 999
    # Remove qualquer resquício anterior para evitar duplicidade no teste
    await db_session.execute(text("DELETE FROM leads WHERE id = :lid"), {"lid": lead_id})
    await db_session.execute(
        text("INSERT INTO leads (id, webhook_config_id, telefone, contato_nome) VALUES (:lid, 1, '5511999990009', 'Lead Teste')"),
        {"lid": lead_id}
    )
    await db_session.commit()
    
    # 4. Cria uma dúvida pendente associada a esse lead_id
    q = UnansweredQuestionModel(
        question="Qual o status do meu teste?",
        agent_id=agent.id,
        session_id=str(lead_id),
        status="PENDENTE"
    )
    db_session.add(q)
    await db_session.commit()
    await db_session.refresh(q)
    
    # 5. Chama a API e verifica se o telefone do lead foi corretamente decodificado na listagem
    response = await client.get("/unanswered-questions?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    items = data["items"]
    # Encontra a dúvida recém-criada
    target_q = next((item for item in items if item["id"] == q.id), None)
    assert target_q is not None
    # Deve conter o telefone do lead ao invés do ID numérico cru!
    assert target_q["session_id"] == "5511999990009"
    
    # Limpeza
    await db_session.delete(q)
    await db_session.execute(text("DELETE FROM leads WHERE id = :lid"), {"lid": lead_id})
    await db_session.commit()

