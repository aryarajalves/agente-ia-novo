import json
import os
from typing import List
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete

from models import SupportRequestModel, WebhookConfigModel
from api.deps import get_db, verify_api_key
from zapvoice_utils import sync_conversation_labels, send_zapvoice_message

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Support"])

async def _resumir_atendimento_robo(req: SupportRequestModel, db: AsyncSession):
    """Executa a lógica de retorno ao robô no ZapVoice."""
    if not req.webhook_config_id or not req.conversation_id or not req.account_id:
        return
    
    try:
        # 1. Buscar configuração do Webhook
        config_res = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.id == req.webhook_config_id))
        config = config_res.scalar_one_or_none()
        if not config:
            return

        zv_url = config.zapvoice_url or os.getenv("ZAPVOICE_URL")
        zv_token = config.zapvoice_api_token or os.getenv("ZAPVOICE_API_TOKEN")
        
        if not zv_url or not zv_token:
            return

        # 2. Definir etiquetas para adicionar/remover
        ignore_label = (config.ignore_by_label or "humano").strip()
        to_add = json.loads(config.ai_handoff_labels_to_add) if config.ai_handoff_labels_to_add else []
        to_remove = json.loads(config.ai_handoff_labels_to_remove) if config.ai_handoff_labels_to_remove else []
        
        # Sempre remover a etiqueta de pausa (humano)
        if ignore_label not in to_remove:
            to_remove.append(ignore_label)

        # 3. Sincronizar etiquetas
        await sync_conversation_labels(
            zv_url, str(req.account_id), int(req.conversation_id), 
            zv_token, to_add=to_add, to_remove=to_remove
        )

        # 4. Enviar mensagem de retorno se configurada
        if config.ai_handoff_message:
            await send_zapvoice_message(
                zv_url, str(req.account_id), int(req.conversation_id),
                zv_token, config.ai_handoff_message
            )
            
        logger.info(f"🤖 Atendimento retomado pela IA para conversa {req.conversation_id} (ZapVoice)")
        
    except Exception as e:
        logger.error(f"Erro ao processar retorno ao robô: {e}")

@router.get("/support-requests")
async def list_support_requests(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Lista todas as solicitações de suporte humano pendentes."""
    try:
        result = await db.execute(
            select(SupportRequestModel)
            .where(SupportRequestModel.status != "RESOLVED")
            .order_by(desc(SupportRequestModel.created_at))
        )
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Erro ao listar suportes: {e}")
        return []

@router.post("/support-requests/{request_id}/resolve")
async def resolve_support_request(request_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Marca uma solicitação como resolvida e retorna para o robô."""
    req = await db.get(SupportRequestModel, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    
    # Executar lógica de retorno ao robô antes de mudar o status
    if req.status != "RESOLVED":
        await _resumir_atendimento_robo(req, db)
    
    req.status = "RESOLVED"
    await db.commit()
    return {"status": "ok"}

from api.schemas import BulkResolveRequest

@router.post("/support-requests/bulk-resolve")
async def bulk_resolve_support_requests(request: BulkResolveRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Marca várias solicitações como resolvidas e retorna para o robô."""
    if not request.ids:
        return {"status": "ok", "count": 0}
    
    # Buscar solicitações para processar retorno individualmente (devido ao Chatwoot)
    res = await db.execute(select(SupportRequestModel).where(SupportRequestModel.id.in_(request.ids)))
    reqs = res.scalars().all()
    
    for req in reqs:
        if req.status != "RESOLVED":
            await _resumir_atendimento_robo(req, db)
        req.status = "RESOLVED"
    
    await db.commit()
    return {"status": "ok", "count": len(reqs)}

@router.post("/support-requests/bulk-delete")
async def bulk_delete_support_requests(request: BulkResolveRequest, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Exclui várias solicitações."""
    if not request.ids:
        return {"status": "ok", "count": 0}
    
    await db.execute(
        delete(SupportRequestModel)
        .where(SupportRequestModel.id.in_(request.ids))
    )
    await db.commit()
    return {"status": "ok", "count": len(request.ids)}

@router.delete("/support-requests/{request_id}")
async def delete_support_request(request_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Exclui uma solicitação específica."""
    req = await db.get(SupportRequestModel, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    await db.delete(req)
    await db.commit()
    return {"status": "ok"}
