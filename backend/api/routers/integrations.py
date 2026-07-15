import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import GoogleTokensModel
from api.deps import get_db, verify_api_key
from google_calendar import GoogleCalendarService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Integrations"])

@router.get("/integrations/google/auth-url")
async def get_google_auth_url(
    agent_id: Optional[int] = None, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Gera a URL de autenticação do Google para um agente ou global."""
    service = GoogleCalendarService(agent_id, db)
    auth_url = await service.get_auth_url()
    return {"auth_url": auth_url}

@router.get("/integrations/google/callback")
async def google_callback(code: str, state: str | None = None, db: AsyncSession = Depends(get_db)):
    """Recebe o código de autorização do Google e salva os tokens."""
    if not state:
        raise HTTPException(status_code=400, detail="Estado (agent_id) ausente")
    
    try:
        if state == 'global':
            agent_id = None
            redirect_path = "/integrations"
        else:
            agent_id = int(state)
            redirect_path = f"/agents/{agent_id}?tab=integracoes"
            
        service = GoogleCalendarService(agent_id, db)
        await service.save_tokens(code)
        
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5300").rstrip('/')
        return RedirectResponse(url=f"{frontend_url}{redirect_path}")
    except Exception as e:
        logger.error(f"Erro no callback do Google: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/integrations/google/status")
async def get_google_status(
    agent_id: Optional[int] = None, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Verifica se o Google Calendar está conectado para o agente especificado."""
    result = await db.execute(select(GoogleTokensModel).where(GoogleTokensModel.agent_id == agent_id))
    token = result.scalars().first()
    return {"connected": token is not None}


from pydantic import BaseModel

class GoogleConfigSchema(BaseModel):
    default_event_color: Optional[str] = None
    add_user_email: Optional[bool] = False

@router.get("/integrations/google/config")
async def get_google_config(
    agent_id: Optional[int] = None, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Busca as configurações adicionais do Google Calendar."""
    result = await db.execute(select(GoogleTokensModel).where(GoogleTokensModel.agent_id == agent_id))
    token = result.scalars().first()
    if not token:
        return {"default_event_color": None, "add_user_email": False}
    return {
        "default_event_color": token.default_event_color,
        "add_user_email": bool(token.add_user_email)
    }

@router.post("/integrations/google/config")
async def update_google_config(
    payload: GoogleConfigSchema,
    agent_id: Optional[int] = None, 
    db: AsyncSession = Depends(get_db), 
    _: None = Depends(verify_api_key)
):
    """Atualiza as configurações adicionais do Google Calendar."""
    result = await db.execute(select(GoogleTokensModel).where(GoogleTokensModel.agent_id == agent_id))
    token = result.scalars().first()
    if not token:
        raise HTTPException(status_code=404, detail="Token do Google Agenda não encontrado. Conecte primeiro.")
        
    token.default_event_color = payload.default_event_color
    token.add_user_email = payload.add_user_email
    await db.commit()
    return {"ok": True, "message": "Configurações do Google Agenda atualizadas."}
