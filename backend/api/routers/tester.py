import logging
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import AgentConfigModel, KnowledgeItemModel, InteractionLog, SessionSummary
from api.schemas import (
    TesterProvocationRequest, TesterEvaluationRequest, TesterSentimentRequest
)
from api.deps import get_db, verify_api_key
from api.services.cost_service import calculate_ai_cost
from agent import get_openai_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Tester (IA Sandbox)"])

async def _log_tester_cost(db: AsyncSession, model: str, usage: Any, action: str, session_id: str = "SYS_TESTER"):
    """Registra o custo das operações de teste no log de interações."""
    if not usage:
        return
    try:
        inp = getattr(usage, "prompt_tokens", 0)
        out = getattr(usage, "completion_tokens", 0)
        cost_usd, cost_brl = calculate_ai_cost(model, inp, out)
        
        log = InteractionLog(
            session_id=session_id,
            user_message=f"Operação Tester ({action})",
            agent_response="Processamento automático do Sandbox",
            model_used=model,
            input_tokens=inp,
            output_tokens=out,
            cost_usd=cost_usd,
            cost_brl=cost_brl
        )
        db.add(log)
        await db.commit()
    except Exception as e:
        logger.error(f"Erro ao logar custo do tester: {e}")

@router.post("/tester/provoke")
async def provoke_agent(
    request: TesterProvocationRequest, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Gera uma fala de provocação baseada em uma persona para testar o agente."""
    client = get_openai_client()
    if not client:
        raise HTTPException(status_code=500, detail="OpenAI não configurada")
    
    dynamic_instruction = ""
    if request.is_dynamic:
        dynamic_instruction = "\nMODO DINÂMICO: Mude seu humor conforme a performance do agente."

    # Contexto de Conhecimento para o Tester
    kb_summary = ""
    if request.agent_id:
        try:
            stmt = select(AgentConfigModel).where(AgentConfigModel.id == request.agent_id).options(selectinload(AgentConfigModel.knowledge_bases))
            agent = (await db.execute(stmt)).scalars().first()
            if agent and agent.knowledge_bases:
                kb_ids = [kb.id for kb in agent.knowledge_bases]
                kb_items = (await db.execute(select(KnowledgeItemModel).where(KnowledgeItemModel.knowledge_base_id.in_(kb_ids)).limit(20))).scalars().all()
                kb_summary = "\n".join([f"- Q: {i.question} | A: {i.answer[:100]}..." for i in kb_items])
        except Exception as e:
            logger.error(f"Erro KB tester: {e}")

    system_content = (
        f"{request.persona_prompt}{dynamic_instruction}\n"
        f"Você é um usuário testando um agente de IA. Gere a próxima fala e uma nota de sentimento (0-100).\n"
        f"Retorne JSON: {{\"provocation\": \"fala\", \"sentiment\": 50}}"
    )
    if request.agent_prompt:
        system_content += f"\n\n[PROMPT DO AGENTE]:\n{request.agent_prompt}"
    if kb_summary:
        system_content += f"\n\n[CONHECIMENTO DO AGENTE]:\n{kb_summary}"

    tester_messages = [{"role": "system", "content": system_content}]
    for msg in request.history[-12:]:
        role = "assistant" if msg["role"] == "user" else "user"
        tester_messages.append({"role": role, "content": msg["content"]})

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=tester_messages,
            response_format={"type": "json_object"},
            temperature=0.8
        )
        res_data = json.loads(response.choices[0].message.content)
        await _log_tester_cost(db, "gpt-4o-mini", response.usage, "Provocação", session_id=request.session_id or "SYS_TESTER")

        # Marcar sessão como teste
        if request.session_id:
            sum_res = await db.execute(select(SessionSummary).where(SessionSummary.session_id == request.session_id))
            summary = sum_res.scalars().first()
            if not summary:
                db.add(SessionSummary(session_id=request.session_id, agent_id=request.agent_id or 0, summary_text="Sessão de Teste", is_test_session=True))
            else:
                summary.is_test_session = True
            await db.commit()

        return res_data
    except Exception as e:
        logger.error(f"Erro no provoke: {e}")
        return {"provocation": "Não entendi sua resposta. Pode repetir?", "sentiment": 40}

@router.post("/tester/evaluate")
async def evaluate_test_session(
    request: TesterEvaluationRequest, 
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """Gera um relatório detalhado de avaliação da conversa de teste."""
    client = get_openai_client()
    if not client:
        raise HTTPException(status_code=500, detail="OpenAI não configurada")
    
    history_text = "\n".join([f"{'Usuário' if m['role'] == 'user' else 'Agente'}: {m['content']}" for m in request.history])

    system_prompt = f"""Analise a conversa abaixo.
Persona do Tester: {request.persona_prompt}

Gere um JSON:
{{
  "score": 0-10,
  "strengths": [],
  "weaknesses": [],
  "recommendation": ""
}}
CONVERSA:
{history_text}
"""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": system_prompt}],
            response_format={"type": "json_object"}
        )
        res_data = json.loads(response.choices[0].message.content)
        await _log_tester_cost(db, "gpt-4o-mini", response.usage, "Avaliação", session_id=request.session_id or "SYS_TESTER")

        if request.session_id:
            sum_res = await db.execute(select(SessionSummary).where(SessionSummary.session_id == request.session_id))
            summary = sum_res.scalars().first()
            if summary:
                summary.test_report = res_data
                summary.is_test_session = True
                await db.commit()

        return res_data
    except Exception as e:
        logger.error(f"Erro na avaliação: {e}")
        raise HTTPException(status_code=500, detail="Falha ao gerar relatório")

@router.post("/tester/sentiment")
async def analyze_sentiment(request: TesterSentimentRequest, _: None = Depends(verify_api_key)):
    """Analisa o sentimento atual do usuário em tempo real."""
    client = get_openai_client()
    if not client:
        return {"sentiment": 50}
    
    system_content = "Analise o sentimento de paciência (0-100). Retorne JSON: {\"sentiment\": 0-100}"
    tester_messages = [{"role": "system", "content": system_content}]
    for msg in request.history[-6:]:
        tester_messages.append({"role": msg["role"], "content": msg["content"]})
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=tester_messages,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except:
        return {"sentiment": 50}

@router.get("/sessions/{session_id}/test-report")
async def get_test_report(session_id: str, db: AsyncSession = Depends(get_db)):
    """Recupera o relatório de teste salvo de uma sessão."""
    res = await db.execute(select(SessionSummary).where(SessionSummary.session_id == session_id))
    summary = res.scalars().first()
    if not summary or not summary.test_report:
        raise HTTPException(status_code=404, detail="Relatório não encontrado")
    return summary.test_report
