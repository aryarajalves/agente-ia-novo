import pytest
from unittest.mock import MagicMock, AsyncMock
from api.routers.inbox import answer_to_prompt
from models import AgentConfigModel, UnansweredQuestionModel

@pytest.mark.asyncio
async def test_inbox_limit_warning():
    # Setup mocks
    db = MagicMock()
    db.get = AsyncMock()
    db.commit = AsyncMock()
    
    agent = AgentConfigModel(
        id=1,
        system_prompt="# INSTRUÇÃO ADICIONAL (Inbox):\nQ1\nA1\n" * 30
    )
    question = UnansweredQuestionModel(id=1, question="Nova Pergunta", status="PENDENTE")
    
    db.get.side_effect = lambda model, qid: agent if model == AgentConfigModel else question
    
    payload = {"agent_id": 1, "answer": "Nova Resposta"}
    
    # Execute
    result = await answer_to_prompt(question_id=1, payload=payload, db=db, _=None)
    
    # Assert
    assert result["success"] is True
    assert "Aviso: Este agente já possui 31 instruções" in result["warning"]
    assert agent.system_prompt.count("# INSTRUÇÃO ADICIONAL (Inbox):") == 31
