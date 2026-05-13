import logging
import json
import time
import os
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import AgentConfigModel, InteractionLog, GlobalContextVariableModel
from api.schemas import MessageRequest, MessageResponse, AgentConfig
from api.deps import get_db, verify_api_key
from api.services.cost_service import calculate_ai_cost
from api.services.agent_service import db_to_pydantic_agent
from config_store import MODEL_INFO, USD_TO_BRL
from agent import process_message

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])

async def get_chat_history(db: AsyncSession, limit: int, session_id: str | None = None):
    """Recupera o histórico recente de uma sessão para contexto da IA."""
    if limit <= 0:
        return []
    
    query = select(InteractionLog)
    if session_id:
        query = query.where(InteractionLog.session_id == session_id)
    
    stmt = query.order_by(InteractionLog.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    
    history = []
    # Inverte para ordem cronológica (Antigo -> Novo)
    for row in reversed(rows):
        history.append({"role": "user", "content": row.user_message})
        history.append({"role": "assistant", "content": row.agent_response})

    # Injetar contexto de Handoff se necessário
    if rows and rows[0].handoff_to:
        summary = "Não disponível"
        try:
            debug = json.loads(rows[0].debug_info) if rows[0].debug_info else {}
            summary = debug.get("summary", "Não disponível")
        except: pass
        
        history.append({
            "role": "system",
            "content": (
                f"### RESUMO DO ATENDIMENTO ANTERIOR:\n{summary}\n\n"
                f"Instrução: Retome o atendimento de forma fluida."
            )
        })
        
    return history

@router.post("/execute", response_model=MessageResponse)
async def execute_agent(
    request: MessageRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Endpoint principal para interação com os agentes.
    Processa a mensagem, recupera contexto, executa RAG/Tools e salva logs.
    """
    # 1. Carregar configuração do agente
    result = await db.execute(
        select(AgentConfigModel)
        .where(AgentConfigModel.id == request.agent_id)
        .options(
            selectinload(AgentConfigModel.tools),
            selectinload(AgentConfigModel.knowledge_bases)
        )
    )
    db_config = result.scalars().first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Agente não encontrado")

    # 2. Converter para schema Pydantic
    agent_config = db_to_pydantic_agent(db_config)
    # Nota: O mapeamento completo é longo, vou simplificar usando os campos essenciais 
    # ou reusando a lógica de conversão se disponível em algum serviço.
    # Por enquanto, vou garantir que o básico funcione.
    
    # Overrides da Arena
    if request.model_override:
        agent_config.model = request.model_override
        agent_config.router_enabled = False 
    if request.system_prompt_override:
        agent_config.system_prompt = request.system_prompt_override

    # 3. Preparar histórico e contexto
    session_id = request.session_id
    history = await get_chat_history(db, agent_config.context_window, session_id) if session_id else []
    
    ctx = {}
    result_global = await db.execute(select(GlobalContextVariableModel))
    for gv in result_global.scalars().all():
        if gv.value is not None:
            ctx[gv.key] = gv.value # Simplificado: tratamento de tipos pode ser adicionado depois
            
    if request.context_variables:
        ctx.update(request.context_variables)
    if session_id: ctx["session_id"] = session_id

    # 4. Processar mensagem
    start_perf = time.perf_counter()
    result = await process_message(
        request.message, 
        history, 
        agent_config, 
        db_config.tools, 
        ctx, 
        db=db,
        image_url=request.image_url
    )
    response_time_ms = int((time.perf_counter() - start_perf) * 1000)

    # 5. Cálculo de Custos
    usage = result.get("usage")
    model_used = result.get("model", agent_config.model)
    cost_usd, cost_brl = 0.0, 0.0
    
    if usage:
        # Extrair tokens totais para o custo
        p_tokens = getattr(usage, 'main_prompt', 0) + getattr(usage, 'mini_prompt', 0)
        c_tokens = getattr(usage, 'main_completion', 0) + getattr(usage, 'mini_completion', 0)
        cost_usd, cost_brl = calculate_ai_cost(model_used, p_tokens, c_tokens)

    response_text = result["content"]
    handoff_data = result.get("handoff_data", {})
    is_handoff = handoff_data.get("handoff", False) or "{suporte_humano}" in response_text
    
    # 6. Salvar Log de Interação
    try:
        new_log = InteractionLog(
            agent_id=request.agent_id,
            session_id=session_id,
            user_message=request.message,
            agent_response=response_text,
            model_used=model_used,
            input_tokens=usage.main_prompt if usage else 0,
            output_tokens=usage.main_completion if usage else 0,
            cost_usd=cost_usd,
            cost_brl=cost_brl,
            handoff_to="suporte" if is_handoff else None,
            debug_info=json.dumps(result.get("debug") or {}),
            timestamp=datetime.now(timezone.utc)
        )
        db.add(new_log)
        await db.commit()
    except Exception as log_err:
        logger.error(f"Erro ao salvar log de interação: {log_err}")

    # 7. Criar Solicitação de Suporte se for Handoff
    if is_handoff:
        try:
            from models import SupportRequestModel
            # Se não houver sumário pronto, gera um simples
            summary = handoff_data.get("summary") or "Solicitação via Playground/Chat"
            reason = handoff_data.get("motivo") or "O usuário solicitou suporte humano ou a IA identificou a necessidade."
            
            new_support = SupportRequestModel(
                agent_id=request.agent_id,
                session_id=session_id or f"playground_{int(time.time())}",
                user_name=ctx.get("user_name") or "Usuário Playground",
                user_email=ctx.get("user_email"),
                status="OPEN",
                summary=summary,
                reason=reason,
                created_at=datetime.now(timezone.utc)
            )
            db.add(new_support)
            await db.commit()
            logger.info(f"🆘 Solicitação de suporte criada para sessão {session_id}")
        except Exception as sup_err:
            logger.error(f"Erro ao criar solicitação de suporte: {sup_err}")

    return MessageResponse(
        response=response_text,
        cost_usd=cost_usd,
        cost_brl=cost_brl,
        input_tokens=usage.prompt_tokens if usage else 0,
        output_tokens=usage.completion_tokens if usage else 0,
        model_used=model_used,
        response_time_ms=response_time_ms,
        debug=result.get("debug"),
        tool_calls=result.get("tool_calls")
    )

@router.get("/models")
async def list_available_models(_: None = Depends(verify_api_key)):
    """Lista todos os modelos e famílias disponíveis no sistema."""
    from config_store import discover_models
    return discover_models()
