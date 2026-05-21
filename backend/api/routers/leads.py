import logging
import json
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from models import WebhookConfigModel
from api.deps import get_db, verify_api_key
from lead_scoring_service import calculate_lead_score

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Leads"])

@router.get("/leads/qualified")
async def list_qualified_leads(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """
    Consolida e lista todos os leads qualificados (que responderam a todas as perguntas)
    de todas as tabelas de leads cadastradas nas configurações do sistema.
    """
    logger.info("Listando leads qualificados consolidados...")
    
    try:
        # 1. Obter todas as tabelas de leads ativas
        res = await db.execute(text("SELECT DISTINCT leads_table FROM webhook_configs"))
        tables = [r[0] for r in res.fetchall() if r[0]]
        
        tables_to_query = set(tables)
        tables_to_query.add("leads")
        
        all_leads = []
        
        # Obter o fallback do CHATWOOT_URL global
        global_chatwoot_url = os.getenv("CHATWOOT_URL", "").rstrip("/")
        
        # 2. Consultar cada tabela
        for table in tables_to_query:
            try:
                # Cria um savepoint para esta iteração do loop, evitando que erros em uma tabela abortem toda a transação
                async with db.begin_nested():
                    query = text(f"""
                        SELECT 
                            id, webhook_config_id, conta_id, inbox_id, inbox_nome, conversa_id, contato_id,
                            telefone, labels, contato_nome, respostas_qualificacao, lead_score,
                            lead_classification, lead_justification, updated_at, created_at
                        FROM {table}
                        WHERE respostas_qualificacao IS NOT NULL AND respostas_qualificacao != ''
                    """)
                    db_leads = await db.execute(query)
                    rows = db_leads.fetchall()
                
                for row in rows:
                    lead_dict = {
                        "id": row[0],
                        "webhook_config_id": row[1],
                        "conta_id": row[2],
                        "inbox_id": row[3],
                        "inbox_nome": row[4],
                        "conversa_id": row[5],
                        "contato_id": row[6],
                        "telefone": row[7],
                        "labels": row[8],
                        "contato_nome": row[9] or "Sem Nome",
                        "respostas_qualificacao": row[10],
                        "lead_score": row[11] if row[12] is not None else None, # Só retorna se foi classificado
                        "lead_classification": row[12],
                        "lead_justification": row[13],
                        "updated_at": row[14].isoformat() if row[14] else None,
                        "created_at": row[15].isoformat() if row[15] else None,
                        "leads_table": table
                    }
                    
                    # Tentar decodificar as respostas de qualificação
                    try:
                        if lead_dict["respostas_qualificacao"]:
                            lead_dict["respostas_decoded"] = json.loads(lead_dict["respostas_qualificacao"])
                        else:
                            lead_dict["respostas_decoded"] = []
                    except Exception:
                        lead_dict["respostas_decoded"] = lead_dict["respostas_qualificacao"]
                        
                    # 3. Gerar URL direta da conversa no Chatwoot se as chaves existirem
                    chatwoot_url = global_chatwoot_url
                    if lead_dict["webhook_config_id"]:
                        wh_res = await db.execute(
                            select(WebhookConfigModel.chatwoot_url)
                            .where(WebhookConfigModel.id == lead_dict["webhook_config_id"])
                        )
                        wh_url = wh_res.scalar()
                        if wh_url:
                            chatwoot_url = wh_url.rstrip("/")
                            
                    if chatwoot_url and lead_dict["conta_id"] and lead_dict["conversa_id"]:
                        lead_dict["chatwoot_conversation_url"] = (
                            f"{chatwoot_url}/app/accounts/{lead_dict['conta_id']}/"
                            f"inbox/{lead_dict['inbox_id'] or '1'}/conversations/{lead_dict['conversa_id']}"
                        )
                    else:
                        lead_dict["chatwoot_conversation_url"] = None
                        
                    all_leads.append(lead_dict)
            except Exception as e:
                # O begin_nested() faz rollback automático se houver exceção, mantendo a transação ativa
                logger.warning(f"Erro ao ler leads da tabela {table}: {e}")
                
        # 4. Ordenar todos os leads por updated_at descendente
        all_leads.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
        return all_leads
        
    except Exception as e:
        logger.error(f"Erro ao listar leads qualificados consolidados: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao listar leads qualificados: {str(e)}")

@router.post("/leads/{table_name}/{lead_id}/recalculate-score")
async def recalculate_lead_score_api(
    table_name: str, 
    lead_id: int, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """
    Recalcula manualmente o lead score de um contato com base nas respostas salvas no banco
    e nos critérios atuais de qualificação configurados no agente.
    """
    logger.info(f"Recalculando score do lead {lead_id} na tabela {table_name}...")
    
    # 1. Buscar o lead correspondente
    try:
        query = text(f"""
            SELECT webhook_config_id, respostas_qualificacao, telefone, contato_nome
            FROM {table_name}
            WHERE id = :lead_id
        """)
        res = await db.execute(query, {"lead_id": lead_id})
        lead_row = res.fetchone()
        
        if not lead_row:
            raise HTTPException(status_code=404, detail="Lead não encontrado na tabela informada.")
            
        webhook_config_id = lead_row[0]
        respostas_str = lead_row[1]
        
        if not respostas_str:
            raise HTTPException(status_code=400, detail="Este lead não possui respostas qualificatórias salvas.")
            
        # 2. Encontrar o agente vinculado a esse webhook_config_id
        agent_id = None
        if webhook_config_id:
            wh_res = await db.execute(
                select(WebhookConfigModel.agent_id)
                .where(WebhookConfigModel.id == webhook_config_id)
            )
            agent_id = wh_res.scalar()
            
        if not agent_id:
            # Fallback buscando se for agente secundário
            if webhook_config_id:
                wh_sec_res = await db.execute(
                    select(WebhookConfigModel.agent_id, WebhookConfigModel.secondary_agent_ids)
                    .where(WebhookConfigModel.id == webhook_config_id)
                )
                wh_sec = wh_sec_res.fetchone()
                if wh_sec:
                    agent_id = wh_sec[0]
        
        if not agent_id:
            # Se não houver webhook cadastrado ou agente vinculado, podemos tentar
            # usar o primeiro agente ativo ou lançar erro se não for possível obter critérios.
            # Vamos buscar o primeiro agente disponível para não travar a aplicação.
            first_agent_res = await db.execute(text("SELECT id FROM agent_config WHERE is_active = TRUE LIMIT 1"))
            first_agent = first_agent_res.fetchone()
            if first_agent:
                agent_id = first_agent[0]
                
        if not agent_id:
            raise HTTPException(status_code=400, detail="Não foi possível identificar o Agente correspondente a este lead.")
            
        # 3. Chamar a IA para recalcular o score
        score_data = await calculate_lead_score(db, agent_id, respostas_str)
        lead_score = score_data.get("lead_score", 0)
        lead_classification = score_data.get("lead_classification", "Frio ❄️")
        lead_justification = score_data.get("lead_justification", "")
        
        # 4. Salvar os novos dados no banco
        update_query = text(f"""
            UPDATE {table_name} SET
                lead_score = :lead_score,
                lead_classification = :lead_classification,
                lead_justification = :lead_justification,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :lead_id
        """)
        await db.execute(update_query, {
            "lead_score": lead_score,
            "lead_classification": lead_classification,
            "lead_justification": lead_justification,
            "lead_id": lead_id
        })
        await db.commit()
        
        return {
            "success": True,
            "lead_score": lead_score,
            "lead_classification": lead_classification,
            "lead_justification": lead_justification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao recalcular score do lead {lead_id} na API: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao recalcular score: {str(e)}")
