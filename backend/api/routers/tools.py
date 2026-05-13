import logging
import json
import os
import httpx
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from models import ToolModel, WebhookConfigModel, WebhookEventModel
from api.schemas import ToolCreate, ToolResponse
from api.deps import get_db, verify_api_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Tools"])

@router.get("/tools", response_model=List[ToolResponse])
async def list_tools(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Lista todas as ferramentas cadastradas no banco."""
    result = await db.execute(select(ToolModel).order_by(ToolModel.id))
    return result.scalars().all()

@router.post("/tools", response_model=ToolResponse)
async def create_tool(tool: ToolCreate, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Cria uma nova ferramenta de automação."""
    db_tool = ToolModel(
        name=tool.name,
        description=tool.description,
        parameters_schema=tool.parameters_schema,
        webhook_url=tool.webhook_url,
        labels_to_add=tool.labels_to_add,
        labels_to_remove=tool.labels_to_remove,
        confirmation_message=tool.confirmation_message
    )
    db.add(db_tool)
    await db.commit()
    await db.refresh(db_tool)
    return db_tool

@router.put("/tools/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: int, 
    tool: ToolCreate, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Atualiza os detalhes de uma ferramenta existente."""
    result = await db.execute(select(ToolModel).where(ToolModel.id == tool_id))
    db_tool = result.scalars().first()
    
    if not db_tool:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada")
    
    db_tool.name = tool.name
    db_tool.description = tool.description
    db_tool.parameters_schema = tool.parameters_schema
    db_tool.webhook_url = tool.webhook_url
    db_tool.labels_to_add = tool.labels_to_add
    db_tool.labels_to_remove = tool.labels_to_remove
    db_tool.confirmation_message = tool.confirmation_message
    
    try:
        await db.commit()
        await db.refresh(db_tool)
        return db_tool
    except Exception as e:
        await db.rollback()
        logger.error(f"Erro ao atualizar ferramenta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tools/{tool_id}")
async def delete_tool(tool_id: int, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Remove uma ferramenta do sistema."""
    result = await db.execute(select(ToolModel).where(ToolModel.id == tool_id))
    tool = result.scalars().first()
    if not tool:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada")
        
    await db.delete(tool)
    await db.commit()
    return {"status": "deleted", "id": tool_id}

@router.get("/chatwoot/labels")
async def get_chatwoot_labels(db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    """Busca as etiquetas disponíveis no Chatwoot via API externa."""
    url = os.getenv("CHATWOOT_URL")
    token = os.getenv("CHATWOOT_API_TOKEN")
    account_id = os.getenv("CHATWOOT_ACCOUNT_ID")
    
    # Tentar fallback caso ENV não esteja presente
    if not url or not token:
        result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.chatwoot_api_token != None).limit(1))
        config = result.scalars().first()
        if config:
            url = config.chatwoot_url
            token = config.chatwoot_api_token
            
    if not url or not token:
        return []
        
    url = url.rstrip("/")
    try:
        async with httpx.AsyncClient() as client:
            headers = {"api_access_token": token}
            
            if not account_id:
                prof_resp = await client.get(f"{url}/api/v1/profile", headers=headers, timeout=10.0)
                if prof_resp.status_code == 200:
                    profile_data = prof_resp.json()
                    accounts = profile_data.get("accounts", [])
                    if accounts:
                        account_id = accounts[0].get("id")
            
            if not account_id:
                return []
            
            labels_resp = await client.get(f"{url}/api/v1/accounts/{account_id}/labels", headers=headers, timeout=10.0)
            if labels_resp.status_code != 200:
                return []
            
            data = labels_resp.json()
            payload = data.get("payload", [])
            return [l["title"] for l in payload if "title" in l]
    except Exception as e:
        logger.error(f"Erro ao buscar labels do Chatwoot: {e}")
        return []

@router.post("/provision-tools")
async def provision_native_tools(_: None = Depends(verify_api_key)):
    """Sincroniza as ferramentas nativas do sistema (Google Calendar, etc) no banco."""
    from database import seed_native_tools
    try:
        await seed_native_tools()
        return {"message": "Ferramentas nativas sincronizadas com sucesso."}
    except Exception as e:
        logger.error(f"Erro ao provisionar ferramentas: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tools/{tool_id}/logs")
async def get_tool_logs(
    tool_id: int, 
    page: int = 1, 
    page_size: int = 20, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Retorna o histórico de execução de uma ferramenta baseada em eventos de webhook."""
    result = await db.execute(select(ToolModel).where(ToolModel.id == tool_id))
    tool = result.scalars().first()
    if not tool:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada")

    offset = (page - 1) * page_size
    stmt = (
        select(WebhookEventModel)
        .where(WebhookEventModel.processing_steps.contains(tool.name))
        .order_by(WebhookEventModel.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    events = (await db.execute(stmt)).scalars().all()

    logs = []
    for ev in events:
        matched_steps = []
        try:
            raw_steps = json.loads(ev.processing_steps or "[]")
            for s in raw_steps:
                # Se o nome da ferramenta está no passo, ou é um ícone de ferramenta nativa
                if tool.name in s.get("step", "") or tool.name in s.get("detail", ""):
                    matched_steps.append(s)
                elif s.get("step", "").startswith("🛠️"):
                    matched_steps.append(s)
        except Exception:
            pass
            
        logs.append({
            "event_id": ev.id,
            "timestamp": ev.created_at.replace(tzinfo=timezone.utc) if ev.created_at else None,
            "steps": matched_steps,
            "status": ev.status
        })
    return logs
