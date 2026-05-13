import logging
import json
import os
import io
import openai
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import FeedbackLog, AgentConfigModel
from api.schemas import FeedbackCreate, FeedbackResponse, FeedbackUpdate, FineTuneJobCreate
from api.deps import get_db, verify_api_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Feedback & Fine-tuning"])

@router.post("/feedback", response_model=FeedbackResponse)
async def create_feedback(
    payload: FeedbackCreate, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Salva um registro de feedback (positivo ou negativo) com correção opcional."""
    log = FeedbackLog(
        agent_id=payload.agent_id,
        interaction_log_id=payload.interaction_log_id,
        user_message=payload.user_message,
        original_response=payload.original_response,
        corrected_response=payload.corrected_response,
        rating=payload.rating,
        system_prompt_snapshot=payload.system_prompt_snapshot,
        correction_note=payload.correction_note,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log

@router.get("/feedback")
async def list_feedback(
    agent_id: Optional[int] = None, 
    rating: Optional[str] = None, 
    exported: Optional[bool] = None, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Lista os registros de feedback, com filtros opcionais."""
    query = select(FeedbackLog).order_by(FeedbackLog.created_at.desc())
    if agent_id:
        query = query.where(FeedbackLog.agent_id == agent_id)
    if rating:
        query = query.where(FeedbackLog.rating == rating)
    if exported is not None:
        query = query.where(FeedbackLog.exported_to_finetune == exported)
        
    result = await db.execute(query)
    rows = result.scalars().all()

    # Enriquecer com nome do agente para facilitar no frontend
    agent_ids = list(set(r.agent_id for r in rows))
    agent_names = {}
    if agent_ids:
        ag_res = await db.execute(select(AgentConfigModel.id, AgentConfigModel.name).where(AgentConfigModel.id.in_(agent_ids)))
        for a_id, a_name in ag_res.all():
            agent_names[a_id] = a_name

    return [
        {
            "id": r.id,
            "agent_id": r.agent_id,
            "agent_name": agent_names.get(r.agent_id, "Agente Excluído"),
            "interaction_log_id": r.interaction_log_id,
            "user_message": r.user_message,
            "original_response": r.original_response,
            "corrected_response": r.corrected_response,
            "rating": r.rating,
            "correction_note": r.correction_note,
            "exported_to_finetune": r.exported_to_finetune,
            "finetune_job_id": r.finetune_job_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]

@router.patch("/feedback/{feedback_id}")
async def update_feedback(
    feedback_id: int, 
    payload: FeedbackUpdate, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Atualiza as informações de correção de um feedback."""
    result = await db.execute(select(FeedbackLog).where(FeedbackLog.id == feedback_id))
    log = result.scalars().first()
    if not log:
        raise HTTPException(status_code=404, detail="Feedback não encontrado")
        
    if payload.user_message is not None:
        log.user_message = payload.user_message
    if payload.corrected_response is not None:
        log.corrected_response = payload.corrected_response
    if payload.correction_note is not None:
        log.correction_note = payload.correction_note
        
    await db.commit()
    await db.refresh(log)
    return {"status": "ok", "message": "Feedback atualizado"}

@router.delete("/feedback/{feedback_id}")
async def delete_feedback(
    feedback_id: int, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Remove um registro de feedback."""
    result = await db.execute(select(FeedbackLog).where(FeedbackLog.id == feedback_id))
    log = result.scalars().first()
    if not log:
        raise HTTPException(status_code=404, detail="Feedback não encontrado")
    await db.delete(log)
    await db.commit()
    return {"message": "Feedback removido"}

@router.get("/feedback/export/{agent_id}")
async def export_feedback_jsonl(
    agent_id: int, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Exporta o dataset para fine-tuning no formato JSONL da OpenAI."""
    result = await db.execute(
        select(FeedbackLog)
        .where(
            FeedbackLog.agent_id == agent_id,
            FeedbackLog.corrected_response != None,
            FeedbackLog.corrected_response != ""
        )
        .order_by(FeedbackLog.created_at.asc())
    )
    logs = result.scalars().all()

    if not logs:
        raise HTTPException(status_code=404, detail="Nenhum exemplo disponível para exportação.")

    lines = []
    for log in logs:
        system_content = log.system_prompt_snapshot or "Você é um assistente inteligente."
        entry = {
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": log.user_message},
                {"role": "assistant", "content": log.corrected_response}
            ]
        }
        lines.append(json.dumps(entry, ensure_ascii=False))

    return Response(
        content="\n".join(lines),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": f"attachment; filename=finetune_agent_{agent_id}.jsonl"}
    )

# --- OpenAI Fine-Tuning Integration ---

@router.post("/fine-tuning/start")
async def start_finetune_job(
    payload: FineTuneJobCreate, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Inicia um job de fine-tuning na OpenAI usando os feedbacks coletados."""
    result = await db.execute(select(FeedbackLog).where(FeedbackLog.agent_id == payload.agent_id))
    all_logs = result.scalars().all()

    # Filtrar apenas exemplos úteis (negativos corrigidos ou positivos originais)
    valid_logs = [
        log for log in all_logs
        if (log.rating == 'negative' and log.corrected_response and log.corrected_response.strip())
        or (log.rating == 'positive' and log.original_response and log.original_response.strip())
    ]

    if len(valid_logs) < 10:
        raise HTTPException(status_code=400, detail=f"Mínimo de 10 exemplos necessários (você tem {len(valid_logs)}).")

    # Gerar JSONL
    lines = []
    for log in valid_logs:
        system_content = log.system_prompt_snapshot or "Você é um assistente inteligente."
        target_response = log.corrected_response if (log.rating == 'negative') else log.original_response
        entry = {
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user", "content": log.user_message},
                {"role": "assistant", "content": target_response}
            ]
        }
        lines.append(json.dumps(entry, ensure_ascii=False))

    jsonl_bytes = "\n".join(lines).encode("utf-8")
    
    # Integração OpenAI
    client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    file_obj = io.BytesIO(jsonl_bytes)
    file_obj.name = f"finetune_agent_{payload.agent_id}.jsonl"

    try:
        uploaded_file = await client.files.create(file=file_obj, purpose="fine-tune")
        job = await client.fine_tuning.jobs.create(
            training_file=uploaded_file.id,
            model=payload.base_model,
            hyperparameters={"n_epochs": payload.n_epochs},
            suffix=payload.suffix
        )

        # Marcar feedbacks como exportados
        for log in valid_logs:
            log.exported_to_finetune = True
            log.finetune_job_id = job.id

        await db.commit()
        return {
            "job_id": job.id,
            "status": job.status,
            "examples_count": len(valid_logs)
        }
    except Exception as e:
        logger.error(f"Erro ao iniciar fine-tune: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fine-tuning/jobs")
async def list_finetune_jobs(_: None = Depends(verify_api_key)):
    """Lista os jobs de fine-tuning recentes na OpenAI."""
    client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    try:
        jobs_page = await client.fine_tuning.jobs.list(limit=20)
        return [
            {
                "id": j.id,
                "model": j.model,
                "fine_tuned_model": j.fine_tuned_model,
                "status": j.status,
                "created_at": j.created_at,
                "error": j.error.message if j.error else None
            }
            for j in jobs_page.data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
