import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from models import UnansweredQuestionModel, KnowledgeBaseModel, KnowledgeItemModel, AgentConfigModel
from api.deps import get_db, verify_api_key
from rag_service import get_embedding

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Inbox"])

@router.get("/unanswered-questions")
async def list_unanswered_questions(
    status: str = Query("PENDENTE"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    try:
        result = await db.execute(
            select(UnansweredQuestionModel)
            .where(UnansweredQuestionModel.status == status)
            .order_by(UnansweredQuestionModel.created_at.desc())
        )
        items = result.scalars().all()
        return {"success": True, "items": items}
    except Exception as e:
        logger.error(f"Erro ao listar dúvidas: {e}")
        return {"success": False, "items": [], "error": str(e)}

@router.post("/unanswered-questions/{question_id}/answer")
async def answer_question(
    question_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Responde uma dúvida e adiciona à base de conhecimento (RAG)."""
    q = await db.get(UnansweredQuestionModel, question_id)
    if not q: raise HTTPException(status_code=404, detail="Dúvida não encontrada")
    
    knowledge_base_id = payload.get("knowledge_base_id")
    answer = payload.get("answer")
    question_text = payload.get("question") or q.question
    
    if not knowledge_base_id or not answer:
        raise HTTPException(status_code=400, detail="ID da Base e Resposta são obrigatórios")
        
    # Adicionar ao RAG
    emb, _ = await get_embedding(question_text)
    new_item = KnowledgeItemModel(
        knowledge_base_id=knowledge_base_id,
        question=question_text,
        answer=answer,
        category="Inbox",
        embedding=emb
    )
    db.add(new_item)
    
    # Marcar como respondida
    q.status = "RESPONDIDA"
    await db.commit()
    return {"success": True}

@router.post("/unanswered-questions/{question_id}/answer-to-prompt")
async def answer_to_prompt(
    question_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Responde uma dúvida adicionando a instrução diretamente ao Prompt do Agente."""
    q = await db.get(UnansweredQuestionModel, question_id)
    if not q: raise HTTPException(status_code=404, detail="Dúvida não encontrada")
    
    agent_id = payload.get("agent_id")
    instruction = payload.get("instruction") or payload.get("answer") # Aceita ambos para compatibilidade
    
    if not agent_id or not instruction:
        logger.warning(f"Tentativa de salvar resposta no prompt falhou: agent_id={agent_id}, instruction_len={len(instruction) if instruction else 0}")
        raise HTTPException(status_code=400, detail="Agent ID e Instrução são obrigatórios")
        
    agent = await db.get(AgentConfigModel, agent_id)
    if not agent: raise HTTPException(status_code=404, detail="Agente não encontrado")

    question_text = payload.get("question") or q.question
    
    # Formata a instrução com Pergunta e Resposta pulando uma linha entre elas
    formatted_instruction = f"Pergunta: {question_text}\n\nResposta: {instruction}"
    
    # Contar quantas instruções do Inbox já existem
    count = agent.system_prompt.count("# INSTRUÇÃO ADICIONAL (Inbox):")
    
    # Adicionar ao final do System Prompt
    agent.system_prompt += f"\n\n# INSTRUÇÃO ADICIONAL (Inbox):\n{formatted_instruction}"
    
    # Marcar como respondida
    q.status = "RESPONDIDA"
    await db.commit()
    
    warning = None
    if count >= 30:
        warning = f"Aviso: Este agente já possui {count + 1} instruções ensinadas via Inbox. Para melhor performance e economia, considere mover algumas informações para a Base de Conhecimento (RAG)."
        logger.warning(f"Limite de instruções do Inbox atingido para o agente {agent_id}: {count + 1} itens.")

    return {"success": True, "warning": warning}

@router.post("/unanswered-questions/{question_id}/discard")
async def discard_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Descarta uma dúvida sem responder."""
    q = await db.get(UnansweredQuestionModel, question_id)
    if not q: raise HTTPException(status_code=404, detail="Dúvida não encontrada")
    
    q.status = "DESCARTADA"
    await db.commit()
    return {"success": True}
