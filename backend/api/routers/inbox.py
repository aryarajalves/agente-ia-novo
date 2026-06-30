import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func

from models import UnansweredQuestionModel, KnowledgeBaseModel, KnowledgeItemModel, AgentConfigModel
from api.deps import get_db, verify_api_key
from rag_service import get_embedding

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Inbox"])

@router.get("/unanswered-questions")
async def list_unanswered_questions(
    status: str = Query("PENDENTE"),
    limit: int = Query(20, ge=1),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    try:
        # Conta o total de registros com esse status
        count_stmt = (
            select(func.count())
            .select_from(UnansweredQuestionModel)
            .where(UnansweredQuestionModel.status == status)
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar() or 0

        # Seleciona os registros paginados
        result = await db.execute(
            select(UnansweredQuestionModel)
            .where(UnansweredQuestionModel.status == status)
            .order_by(UnansweredQuestionModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = result.scalars().all()

        # Enriquecer os registros decodificando o session_id numérico ou com tel_ para telefone real
        from models import WebhookEventModel, WebhookConfigModel
        from sqlalchemy import text
        enriched_items = []
        for q in items:
            phone = q.session_id
            if q.session_id:
                if q.session_id.startswith("tel_"):
                    phone = q.session_id[4:]
                elif q.session_id.isdigit():
                    # 1. Tenta buscar pelo ID do Lead na tabela 'leads' padrão
                    try:
                        lead_res = await db.execute(
                            text("SELECT telefone FROM leads WHERE id = :lid"),
                            {"lid": int(q.session_id)}
                        )
                        db_phone = lead_res.scalar()
                        if db_phone:
                            phone = db_phone
                    except Exception:
                        pass
                    
                    # 2. Se não encontrou na 'leads' padrão, tenta buscar pelas tabelas dos webhooks associados ao agente
                    if phone == q.session_id:
                        try:
                            wh_res = await db.execute(
                                select(WebhookConfigModel.leads_table)
                                .where(WebhookConfigModel.agent_id == q.agent_id)
                            )
                            tables = set(wh_res.scalars().all())
                            for table in tables:
                                if table and table != "leads":
                                    try:
                                        lead_res = await db.execute(
                                            text(f"SELECT telefone FROM {table} WHERE id = :lid"),
                                            {"lid": int(q.session_id)}
                                        )
                                        db_phone = lead_res.scalar()
                                        if db_phone:
                                            phone = db_phone
                                            break
                                    except Exception:
                                        pass
                        except Exception:
                            pass

                    # 3. Fallback original: se ainda for o ID, tenta buscar por contato_id em webhook_events
                    if phone == q.session_id:
                        event_result = await db.execute(
                            select(WebhookEventModel.telefone)
                            .where(WebhookEventModel.contato_id == q.session_id)
                            .order_by(WebhookEventModel.created_at.desc())
                            .limit(1)
                        )
                        db_phone = event_result.scalar()
                        if db_phone:
                            phone = db_phone


            # Extrair SESSION_ID_ORIGINAL do contexto, se existir (salvo pelo handler de dúvidas)
            chat_session_id = None
            if q.context:
                for line in q.context.splitlines():
                    if line.startswith("SESSION_ID_ORIGINAL:"):
                        raw_val = line.replace("SESSION_ID_ORIGINAL:", "").strip()
                        if raw_val:
                            chat_session_id = raw_val
                        break

            enriched_items.append({
                "id": q.id,
                "agent_id": q.agent_id,
                "session_id": phone or q.session_id,
                "session_id_raw": q.session_id,
                "chat_session_id": chat_session_id,
                "question": q.question,
                "context": q.context,
                "status": q.status,
                "source": q.source,
                "created_at": q.created_at.isoformat() if q.created_at else None,
                "updated_at": q.updated_at.isoformat() if q.updated_at else None
            })


        return {"success": True, "items": enriched_items, "total": total}
    except Exception as e:
        logger.error(f"Erro ao listar dúvidas: {e}")
        return {"success": False, "items": [], "total": 0, "error": str(e)}

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

@router.post("/unanswered-questions/bulk-discard")
async def bulk_discard_questions(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Descarta múltiplas dúvidas de uma vez."""
    ids = payload.get("ids")
    if not ids or not isinstance(ids, list):
        raise HTTPException(status_code=400, detail="Lista de IDs 'ids' é obrigatória")
        
    try:
        stmt = (
            update(UnansweredQuestionModel)
            .where(UnansweredQuestionModel.id.in_(ids))
            .values(status="DESCARTADA", updated_at=datetime.now(timezone.utc))
        )
        await db.execute(stmt)
        await db.commit()
        return {"success": True}
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro no descarte em massa: {e}")
        return {"success": False, "error": str(e)}
