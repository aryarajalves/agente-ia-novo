import pytest
from httpx import AsyncClient
from sqlalchemy import select
from models import UnansweredQuestionModel, AgentConfigModel

@pytest.mark.asyncio
async def test_answer_to_prompt_flow(client: AsyncClient, db_session):
    # 1. Create an agent with initial prompt
    agent = AgentConfigModel(
        name="FAQ Agent", 
        description="Test Agent for FAQ",
        system_prompt="## Instruções\nVocê é um assistente."
    )
    db_session.add(agent)
    await db_session.commit()
    await db_session.refresh(agent)

    # 2. Create an unanswered question
    q = UnansweredQuestionModel(
        question="Como funciona o suporte?",
        agent_id=agent.id,
        status="PENDENTE"
    )
    db_session.add(q)
    await db_session.commit()
    await db_session.refresh(q)

    # 3. Answer to prompt
    payload = {
        "agent_id": agent.id,
        "answer": "O suporte funciona 24/7 via chat.",
        "question": "Como funciona o suporte?"
    }
    response = await client.post(f"/unanswered-questions/{q.id}/answer-to-prompt", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True

    # 4. Verify agent prompt update
    await db_session.refresh(agent)
    assert "## FAQ Adicional" in agent.system_prompt
    assert "# Como funciona o suporte?\n\nO suporte funciona 24/7 via chat." in agent.system_prompt

    # 5. Verify question status
    await db_session.refresh(q)
    assert q.status == "RESPONDIDA"

    # 6. Test with existing FAQ header
    q2 = UnansweredQuestionModel(
        question="Qual o horário?",
        agent_id=agent.id,
        status="PENDENTE"
    )
    db_session.add(q2)
    await db_session.commit()
    await db_session.refresh(q2)

    payload2 = {
        "agent_id": agent.id,
        "answer": "Das 9h às 18h.",
        "question": "Qual o horário?"
    }
    response2 = await client.post(f"/unanswered-questions/{q2.id}/answer-to-prompt", json=payload2)
    assert response2.status_code == 200
    
    await db_session.refresh(agent)
    # Check if both questions are there and the header is unique
    assert agent.system_prompt.count("## FAQ Adicional") == 1
    assert "# Qual o horário?" in agent.system_prompt
    assert "Das 9h às 18h." in agent.system_prompt
