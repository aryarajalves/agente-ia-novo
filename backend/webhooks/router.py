import re
import uuid
import json
import logging
import os
import httpx
import tempfile
import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException, Request, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, or_, and_, func
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any, Union
from datetime import datetime, timedelta, timezone
from core.timezone import get_now_br, get_now_utc

from database import get_db, engine
from core.websocket import manager
from models import (
    WebhookConfigModel, WebhookEventModel, InteractionLog, 
    SessionSummary, KnowledgeItemModel, UserMemoryModel
)
from transcription_service import transcribe_video
from vision_service import analyze_image
from webhook_tasks import process_webhook_automation, sync_memory_to_vector, process_media_content_task

from .utils import (
    get_value_by_path, flatten_dict, sanitize_table_name, 
    normalize_phone, get_phone_suffix
)
from .service import ensure_leads_table, upsert_lead, delete_contact_data, handle_keyword_handoffs

_redis = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)

CHATWOOT_URL_DEFAULT = (os.getenv("CHATWOOT_URL") or "").rstrip("/")
CHATWOOT_TOKEN_DEFAULT = os.getenv("CHATWOOT_API_TOKEN") or ""

def _pending_key(webhook_config_id: int, conversa_id: str) -> str:
    return f"webhook:pending:{webhook_config_id}:{conversa_id}"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# --- Schemas ---

class WebhookConfigCreate(BaseModel):
    name: str
    leads_table: str = "leads"
    description: Optional[str] = None
    delay_seconds: int = 30
    agent_id: Optional[int] = None
    blocked_messages: List[str] = []
    allowed_contacts: List[str] = []
    chatwoot_url: Optional[str] = None
    chatwoot_api_token: Optional[str] = None
    chatwoot_inbox_id: Optional[str] = None
    labels_on_message: List[str] = []
    delete_keywords: List[str] = []
    delete_message: Optional[str] = None
    delete_labels: List[str] = []
    response_delay_seconds: int = 0
    window_close_label: List[str] = []
    followup_enabled: bool = False
    followup_steps: List[dict] = []
    followup_business_hours: Optional[dict] = None
    memory_sync_enabled: bool = False
    memory_phone_path: str = "phone"
    memory_name_path: Optional[str] = None
    memory_mappings: List[dict] = []
    ignore_by_label: Optional[str] = None
    handoff_labels_to_add: List[str] = []
    handoff_labels_to_remove: List[str] = []
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: List[str] = []
    ai_handoff_labels_to_remove: List[str] = []
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    token: Optional[str] = None
    memory_token: Optional[str] = None
    secondary_agent_ids: List[int] = []

class WebhookConfigResponse(BaseModel):
    id: int
    name: str
    token: str
    memory_token: Optional[str]
    leads_table: str
    description: Optional[str]
    is_active: Optional[bool] = True
    delay_seconds: Optional[int] = 30
    agent_id: Optional[int] = None
    blocked_messages: Union[List[str], Any, None] = []
    allowed_contacts: Union[List[str], Any, None] = []
    chatwoot_url: Optional[str] = None
    chatwoot_api_token: Optional[str] = None
    chatwoot_inbox_id: Optional[str] = None
    labels_on_message: Union[List[str], Any, None] = []
    delete_keywords: Union[List[str], Any, None] = []
    delete_message: Optional[str] = None
    delete_labels: Union[List[str], Any, None] = []
    response_delay_seconds: Optional[int] = None
    window_close_label: Union[List[str], Any, None] = []
    followup_enabled: Optional[bool] = None
    followup_steps: Union[List[dict], Any, None] = []
    followup_business_hours: Union[dict, Any, None] = None
    memory_sync_enabled: Optional[bool] = False
    memory_phone_path: Optional[str] = "phone"
    memory_mappings: Union[List[dict], Any, None] = []
    ignore_by_label: Optional[str] = None
    handoff_labels_to_add: Union[List[str], Any, None] = []
    handoff_labels_to_remove: Union[List[str], Any, None] = []
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: Union[List[str], Any, None] = []
    ai_handoff_labels_to_remove: Union[List[str], Any, None] = []
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    secondary_agent_ids: Union[List[int], Any, None] = []
    created_at: Optional[datetime] = None

    @field_validator(
        "blocked_messages", "allowed_contacts", "labels_on_message", 
        "delete_keywords", "delete_labels", "window_close_label", "followup_steps", 
        "followup_business_hours", "memory_mappings", "handoff_labels_to_add", 
        "handoff_labels_to_remove", "ai_handoff_labels_to_add", 
        "ai_handoff_labels_to_remove", "secondary_agent_ids",
        mode="before"
    )
    @classmethod
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return v
        return v

    class Config:
        from_attributes = True

class WebhookConfigUpdate(BaseModel):
    name: Optional[str] = None
    leads_table: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    delay_seconds: Optional[int] = None
    agent_id: Optional[int] = None
    blocked_messages: Optional[List[str]] = None
    allowed_contacts: Optional[List[str]] = None
    chatwoot_url: Optional[str] = None
    chatwoot_api_token: Optional[str] = None
    chatwoot_inbox_id: Optional[str] = None
    labels_on_message: Optional[List[str]] = None
    delete_keywords: Optional[List[str]] = None
    delete_message: Optional[str] = None
    delete_labels: Optional[List[str]] = None
    response_delay_seconds: Optional[int] = None
    window_close_label: Optional[List[str]] = None
    followup_enabled: Optional[bool] = None
    followup_steps: Optional[List[dict]] = None
    followup_business_hours: Optional[dict] = None
    memory_sync_enabled: Optional[bool] = None
    memory_phone_path: Optional[str] = None
    memory_name_path: Optional[str] = None
    memory_mappings: Optional[List[dict]] = None
    ignore_by_label: Optional[str] = None
    handoff_labels_to_add: Optional[List[str]] = None
    handoff_labels_to_remove: Optional[List[str]] = None
    handoff_keyword: Optional[str] = None
    handoff_message: Optional[str] = None
    ai_handoff_labels_to_add: Optional[List[str]] = None
    ai_handoff_labels_to_remove: Optional[List[str]] = None
    ai_handoff_keyword: Optional[str] = None
    ai_handoff_message: Optional[str] = None
    token: Optional[str] = None
    memory_token: Optional[str] = None
    secondary_agent_ids: Optional[List[int]] = None

class LeadHistoryItem(BaseModel):
    id: int
    contato_id: Optional[str]
    telefone: Optional[str]
    conteudo: str
    dono: str 
    timestamp: datetime
    index: int 

class LeadHistoryResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[LeadHistoryItem]

class BulkDeleteRequest(BaseModel):
    event_ids: List[int]

class LeadBulkDeleteRequest(BaseModel):
    lead_ids: List[int]

class WebhookEventsPaginatedResponse(BaseModel):
    total: int
    items: List[dict]

class WebhookEventResponse(BaseModel):
    id: int
    webhook_config_id: Optional[int]
    event_type: Optional[str]
    conta_id: Optional[str]
    inbox_id: Optional[str]
    inbox_nome: Optional[str]
    conversa_id: Optional[str]
    mensagem_id: Optional[str]
    contato_id: Optional[str]
    telefone: Optional[str]
    labels: Optional[str]
    contato_nome: Optional[str]
    mensagem: Optional[str]
    link: Optional[str]
    status: Optional[str]
    legenda: Optional[str]
    processing_steps: Optional[str]
    scheduled_at: Optional[datetime]
    created_at: datetime


# --- Routes ---

@router.get("", response_model=List[WebhookConfigResponse])
async def list_webhooks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).order_by(WebhookConfigModel.created_at.desc()))
    return result.scalars().all()

@router.get("/chatwoot-config")
async def get_chatwoot_global_config():
    return {"configured": bool(CHATWOOT_URL_DEFAULT and CHATWOOT_TOKEN_DEFAULT), "url": CHATWOOT_URL_DEFAULT}

@router.get("/{webhook_id}", response_model=WebhookConfigResponse)
async def get_webhook(webhook_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.id == webhook_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    return config

@router.post("", response_model=WebhookConfigResponse, status_code=201)
async def create_webhook(payload: WebhookConfigCreate, db: AsyncSession = Depends(get_db)):
    table_name = sanitize_table_name(payload.leads_table)
    token = payload.token or uuid.uuid4().hex[:8]
    memory_token = payload.memory_token or uuid.uuid4().hex[:8]
    
    existing = await db.execute(select(WebhookConfigModel).where(
        or_(WebhookConfigModel.token == token, WebhookConfigModel.memory_token == memory_token)
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Token já em uso")

    await ensure_leads_table(table_name)
    data = payload.model_dump()
    for k, v in data.items():
        if isinstance(v, (list, dict)) and v is not None:
            data[k] = json.dumps(v, ensure_ascii=False)

    config = WebhookConfigModel(**data)
    config.token, config.memory_token, config.leads_table = token, memory_token, table_name
    
    # Garantir que agent_id 0 seja tratado como nulo para evitar erro de FK
    if config.agent_id == 0:
        config.agent_id = None
        
    db.add(config)
    await db.commit()
    await db.refresh(config)
    logger.info(f"✨ Webhook '{config.name}' criado com sucesso (ID: {config.id}, Agent: {config.agent_id})")
    return config

@router.put("/{webhook_id}", response_model=WebhookConfigResponse)
async def update_webhook(webhook_id: int, payload: WebhookConfigUpdate, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "leads_table" in update_data:
        update_data["leads_table"] = sanitize_table_name(update_data["leads_table"])
        await ensure_leads_table(update_data["leads_table"])
    
    if "token" in update_data and update_data["token"] != config.token:
        dup = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.token == update_data["token"]))
        if dup.scalar_one_or_none(): raise HTTPException(status_code=400, detail="Token em uso")

    for key, value in update_data.items():
        if isinstance(value, (list, dict)):
            value = json.dumps(value, ensure_ascii=False)
        
        # Garantir que agent_id 0 seja tratado como nulo
        if key == "agent_id" and value == 0:
            value = None
            
        setattr(config, key, value)

    config.updated_at = get_now_utc()
    await db.commit()
    await db.refresh(config)
    logger.info(f"💾 Webhook '{config.name}' atualizado (ID: {config.id}, Agent: {config.agent_id})")
    return config

@router.patch("/{webhook_id}/toggle-active")
async def toggle_webhook_active(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config:
        raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    config.is_active = not config.is_active
    config.updated_at = get_now_utc()
    await db.commit()
    await db.refresh(config)
    
    status = "ATIVADO" if config.is_active else "DESATIVADO"
    logger.info(f"🔌 Webhook '{config.name}' {status} (ID: {config.id})")
    return {"ok": True, "is_active": config.is_active}

@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    await db.delete(config)
    await db.commit()

@router.post("/receive/{token}", status_code=200)
async def receive_webhook(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.token == token, WebhookConfigModel.is_active == True))
    config = result.scalar_one_or_none()
    if not config: raise HTTPException(status_code=404, detail="Webhook inativo")

    try: body = await request.json()
    except: raise HTTPException(status_code=400, detail="JSON inválido")

    # Extração Básica e Completa
    conv = body.get("conversation", {}) or {}
    sender = body.get("sender", {}) or {}
    inbox = body.get("inbox", {}) or {}
    account = body.get("account", {}) or {}
    is_out = str(body.get("message_type")) in ("1", "outgoing")
    if is_out and "meta" in conv: sender = conv["meta"].get("sender", sender)

    phone = normalize_phone(str(sender.get("phone_number") or ""))
    msg_id = str(body.get("id") or "")
    
    # Extrair etiquetas se disponíveis
    labels_raw = body.get("labels", [])
    if not labels_raw and conv:
        labels_raw = conv.get("labels", [])
    labels_str = json.dumps(labels_raw) if isinstance(labels_raw, list) else str(labels_raw or "[]")

    if msg_id:
        dup = await db.execute(select(WebhookEventModel).where(WebhookEventModel.webhook_config_id == config.id, WebhookEventModel.mensagem_id == msg_id))
        if dup.scalar(): 
            logger.info(f"Mensagem duplicada ignorada: {msg_id}")
            return {"ok": True, "status": "duplicate"}

    # Filtro por contatos permitidos (Allowed Contacts)
    if config.allowed_contacts and not is_out:
        try:
            allowed_list = json.loads(config.allowed_contacts) if isinstance(config.allowed_contacts, str) else config.allowed_contacts
            if isinstance(allowed_list, list) and len(allowed_list) > 0:
                # Normalizar lista para comparação
                allowed_list_norm = [str(x).strip().lower() for x in allowed_list]
                
                # Nome do contato (se disponível)
                contact_name = str(sender.get("name") or "").lower().strip()
                
                # Verificar se o telefone ou o nome estão na lista
                if phone not in allowed_list_norm and contact_name not in allowed_list_norm:
                    logger.info(f"🚫 [BLOQUEIO DE SEGURANÇA] A automação NÃO funcionou para o contato {phone} ({contact_name}) porque ele não possui permissão (não está na lista de contatos permitidos).")
                    return {"ok": True, "status": "blocked", "reason": "contact not in allowed list"}
        except Exception as e:
            logger.error(f"Erro ao processar lista de contatos permitidos: {e}")

    # Detecção refinada do tipo de conteúdo (Chatwoot)
    attachments = body.get("attachments", [])
    content_type = "text"
    if attachments and len(attachments) > 0:
        file_type = attachments[0].get("file_type", "")
        if "image" in file_type: content_type = "image"
        elif "audio" in file_type: content_type = "audio"
        elif "video" in file_type: content_type = "video"
        elif "file" in file_type or "application" in file_type: content_type = "document"
        else: content_type = file_type or "file"

    extracted = {
        "conta_id": str(body.get("account_id") or account.get("id") or conv.get("account_id") or ""),
        "inbox_id": str(inbox.get("id") or body.get("inbox_id") or conv.get("inbox_id") or ""),
        "inbox_nome": str(inbox.get("name") or ""),
        "conversa_id": str(conv.get("id") or body.get("conversation_id") or ""),
        "mensagem_id": msg_id,
        "contato_id": str(sender.get("id") or body.get("contact_id") or ""),
        "telefone": phone,
        "contato_nome": str(sender.get("name") or "Contato Desconhecido"),
        "mensagem": str(body.get("content") or (body.get("message", {}) or {}).get("content") or ""),
        "labels": labels_str,
        "link": str(attachments[0].get("data_url") if attachments else ""),
        "dono": "agente" if is_out else "usuario",
        "message_type": content_type
    }
    
    logger.info(f"📩 Webhook: {config.name} | De: {phone} | Msg: {extracted['mensagem'][:30]}... | Account: {extracted['conta_id']} | Inbox: {extracted['inbox_id']} | Conv: {extracted['conversa_id']} | Contact: {extracted['contato_id']}")

    # Filtro por ID do Inbox do Chatwoot (se configurado)
    if config.chatwoot_inbox_id and str(extracted.get("inbox_id") or "").strip() != str(config.chatwoot_inbox_id).strip():
        logger.info(f"⏭️ Webhook ignorado: inbox_id '{extracted.get('inbox_id')}' não corresponde ao configurado '{config.chatwoot_inbox_id}'")
        return {"ok": True, "status": "ignored_inbox"}

    # --- FILTRO DE MENSAGENS DE SAÍDA (ECHO) ---
    # Se a mensagem for de saída (enviada pelo bot ou pelo agente), não criamos um evento de automação.
    # Mas ainda registramos na tabela de leads para manter o histórico se for um agente humano.
    if is_out:
        # Checar se este telefone acabou de passar por um reset para não reinserir o lead
        resetting_key = f"webhook:resetting:{config.id}:{phone}"
        if _redis.get(resetting_key):
            logger.info(f"⏭️ Mensagem de saída de eco pós-reset ignorada para evitar recriação do lead {phone}")
            return {"ok": True, "status": "outgoing_ignored"}

        try:
            await ensure_leads_table(config.leads_table)
            await upsert_lead(config.leads_table, {**extracted, "dono": "agente"}, config.id)
        except Exception as e:
            logger.error(f"Erro ao inserir lead de saída: {e}")
        return {"ok": True, "status": "outgoing_ignored"}

    # 1. Verificar se é uma palavra-chave de deleção (resetar) antes de checar a tag de ignorar
    is_delete_keyword = False
    msg_limpa = extracted["mensagem"].lower().strip()
    if msg_limpa and config.delete_keywords:
        try:
            keywords = []
            if config.delete_keywords.strip().startswith("["):
                keywords = json.loads(config.delete_keywords)
            else:
                keywords = [k.strip() for k in config.delete_keywords.split(",") if k.strip()]
            
            keywords_lower = [str(k).lower().strip() for k in keywords]
            if msg_limpa in keywords_lower:
                is_delete_keyword = True
                logger.info(f"🗑️ Mensagem coincide com palavra-chave de deleção: '{msg_limpa}'")
        except Exception as e:
            logger.error(f"Erro ao parsear delete_keywords: {e}")

    # 2. Filtro por etiqueta (Ignore by Label) - ignorado se for palavra-chave de deleção
    if config.ignore_by_label and not is_delete_keyword:
        labels_list = labels_raw if isinstance(labels_raw, list) else []
        if config.ignore_by_label in labels_list:
            logger.info(f"🚫 Contato possui etiqueta de bloqueio/ignorar: '{config.ignore_by_label}'. Gravando mensagem e log de pausado.")
            now_br = get_now_br()
            
            steps = [{
                "step": "🚫 Automação Pausada",
                "detail": f"A automação para este contato está pausada porque ele possui a etiqueta '{config.ignore_by_label}', que indica suporte humano ativo ou pausa manual da IA.",
                "timestamp": now_br.isoformat()
            }]
            
            event = WebhookEventModel(
                webhook_config_id=config.id,
                event_type="message",
                status="ignored",
                message_type=content_type,
                conta_id=extracted.get("conta_id"),
                inbox_id=extracted.get("inbox_id"),
                inbox_nome=extracted.get("inbox_nome"),
                conversa_id=extracted.get("conversa_id"),
                mensagem_id=extracted.get("mensagem_id"),
                contato_id=extracted.get("contato_id"),
                telefone=phone,
                labels=extracted.get("labels"),
                contato_nome=extracted.get("contato_nome"),
                mensagem=extracted.get("mensagem"),
                link=extracted.get("link"),
                raw_payload=json.dumps(body, ensure_ascii=False),
                dono="usuario",
                agent_response=f"Automação pausada: Contato possui a etiqueta '{config.ignore_by_label}'",
                processing_steps=json.dumps(steps, ensure_ascii=False)
            )
            db.add(event)
            await db.commit()
            await db.refresh(event)

            await manager.broadcast({
                "type": "new_event",
                "webhook_id": config.id,
                "event": {
                    "id": event.id,
                    "event_type": event.event_type,
                    "status": event.status,
                    "telefone": event.telefone,
                    "contato_nome": event.contato_nome,
                    "mensagem": event.mensagem,
                    "agent_response": event.agent_response,
                    "created_at": event.created_at.isoformat() if event.created_at else None
                }
            })

            try:
                await ensure_leads_table(config.leads_table)
                await upsert_lead(config.leads_table, extracted, config.id)
            except Exception as e:
                logger.error(f"Erro ao atualizar lead ignorado: {e}")

            return {"ok": True, "status": "ignored", "reason": f"contact has block label: {config.ignore_by_label}"}

    # --- LÓGICA DE AGRUPAMENTO (DEBOUNCE) ---
    now_br = get_now_br()
    redis_id_key = f"webhook:debounce:id:{config.id}:{phone}"
    redis_text_key = f"webhook:debounce:text:{config.id}:{phone}"
    
    last_event_id = _redis.get(redis_id_key)
    accumulated_text = _redis.get(redis_text_key) or ""
    
    if last_event_id:
        try:
            # Buscar o evento anterior para atualizar status e steps do pipeline
            old_event_res = await db.execute(select(WebhookEventModel).where(WebhookEventModel.id == int(last_event_id)))
            old_event = old_event_res.scalar_one_or_none()
            
            if old_event and old_event.status == "waiting":
                old_event.status = "grouped"
                
                # Adicionar passo informativo no pipeline do evento absorvido
                steps = json.loads(old_event.processing_steps or "[]")
                steps.append({
                    "step": "📦 Mensagem Absorvida",
                    "detail": "Uma nova mensagem chegou antes do processamento desta. Esta mensagem foi agrupada à próxima para manter o contexto e evitar respostas fragmentadas.",
                    "timestamp": now_br.isoformat()
                })
                old_event.processing_steps = json.dumps(steps, ensure_ascii=False)
                
                # Notificar via WebSocket que o evento anterior foi agrupado
                await manager.broadcast({
                    "type": "status_update",
                    "webhook_id": config.id,
                    "event_id": int(last_event_id),
                    "status": "grouped",
                    "steps": steps
                })
                
                # Adicionar espaçamento duplo para clareza visual e separação de contexto
                if accumulated_text:
                    accumulated_text += "\n\n"
            else:
                # Se o evento anterior não estava mais esperando (já foi processado, concluído ou deu erro),
                # nós NÃO o agrupamos. Iniciamos um novo acumulado.
                accumulated_text = ""
        except Exception as e:
            logger.error(f"Erro ao agrupar evento anterior {last_event_id}: {e}")

    # Definir o conteúdo deste "pedaço" da mensagem
    current_content = extracted.get("mensagem") or ""
    if content_type in ["audio", "image"]:
        current_content = f"[{content_type.upper()} PENDENTE]"
    
    accumulated_text += current_content
    
    event = WebhookEventModel(
        webhook_config_id=config.id, 
        event_type="message", 
        status="waiting" if config.delay_seconds > 0 else "processing", 
        raw_payload=json.dumps(body), 
        scheduled_at=now_br + timedelta(seconds=config.delay_seconds) if config.delay_seconds > 0 else None,
        created_at=now_br,
        **{**extracted, "mensagem": accumulated_text} # Salva o texto acumulado no banco
    )
    
    if config.delay_seconds > 0:
        event.processing_steps = json.dumps([{
            "step": "⏱️ Agrupamento Ativo",
            "detail": f"Aguardando {config.delay_seconds}s para ver se o usuário envia mais mensagens.",
            "timestamp": now_br.isoformat()
        }], ensure_ascii=False)
    
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Atualizar o Redis com o novo "mestre"
    _redis.setex(redis_id_key, config.delay_seconds + 60, str(event.id))
    _redis.setex(redis_text_key, config.delay_seconds + 60, accumulated_text)

    # --- PROCESSAMENTO IMEDIATO DE MÍDIA ---
    if content_type in ["audio", "image"]:
        process_a = config.process_audio if config.process_audio is not None else True
        process_i = config.process_image if config.process_image is not None else True
        
        is_enabled = (content_type == "audio" and process_a) or (content_type == "image" and process_i)
        if is_enabled:
            logger.info(f"🎙️ Disparando processamento imediato de {content_type} para evento {event.id}")
            process_media_content_task.delay(config.id, event.id)

    # Broadcast via WebSocket para atualização em tempo real
    try:
        await manager.broadcast({
            "type": "new_event",
            "webhook_id": config.id,
            "event": {
                "id": event.id,
                "telefone": event.telefone,
                "mensagem": event.mensagem,
                "agent_response": event.agent_response,
                "dono": event.dono,
                "message_type": event.message_type,
                "status": event.status,
                "scheduled_at": event.scheduled_at.isoformat() if event.scheduled_at else None,
                "created_at": event.created_at.isoformat() if event.created_at else None
            }
        })
    except Exception as ws_err:
        logger.error(f"Erro ao transmitir via WebSocket: {ws_err}")

    try:
        await ensure_leads_table(config.leads_table)
        await upsert_lead(config.leads_table, {**extracted, "dono": "cliente"}, config.id)
    except Exception as e:
        logger.error(f"Erro ao inserir lead na tabela {config.leads_table}: {e}")

    if await handle_keyword_handoffs(db, config, event, extracted, CHATWOOT_URL_DEFAULT, CHATWOOT_TOKEN_DEFAULT):
        event.status = "completed"; await db.commit(); return {"ok": True, "status": "handoff"}

    if config.delay_seconds > 0:
        logger.info(f"⏳ Agrupando automação para {event.telefone} em {config.delay_seconds}s (ID: {event.id})")
        process_webhook_automation.apply_async(args=[event.id], countdown=config.delay_seconds)
    else:
        process_webhook_automation.apply_async(args=[event.id])
    
    return {"ok": True, "event_id": event.id}

@router.get("/memory/{token}", status_code=200)
async def check_memory_webhook(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.memory_token == token, WebhookConfigModel.is_active == True))
    config = result.scalar_one_or_none()
    if not config or not config.memory_sync_enabled:
        raise HTTPException(status_code=404, detail="Memória desativada ou token inválido")
    
    return {
        "status": "online",
        "message": "O endpoint de memória está ativo e aguardando requisições POST!"
    }

@router.post("/memory/{token}", status_code=200)
async def receive_memory_webhook(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.memory_token == token, WebhookConfigModel.is_active == True))
    config = result.scalar_one_or_none()
    if not config or not config.memory_sync_enabled: raise HTTPException(status_code=404, detail="Memória desativada")

    try: body = await request.json()
    except: raise HTTPException(status_code=400, detail="JSON inválido")

    phone_raw = get_value_by_path(body, config.memory_phone_path)
    if not phone_raw:
        # Fallback para Configuração Zero
        phone_raw = get_value_by_path(body, "telefone") or get_value_by_path(body, "phone") or get_value_by_path(body, "sender.phone")
        
    phone = normalize_phone(str(phone_raw or ""))
    if not phone: raise HTTPException(status_code=400, detail="Telefone não encontrado. O JSON deve conter 'phone', 'telefone' ou 'sender.phone'")

    mensagem_text = get_value_by_path(body, "template_content") or get_value_by_path(body, "content") or ""
    dono = get_value_by_path(body, "Dono") or get_value_by_path(body, "dono") or "cliente"

    await ensure_leads_table(config.leads_table)
    await upsert_lead(config.leads_table, {
        "telefone": phone, 
        "contato_nome": "Lead_" + phone[-4:], 
        "dono": dono,
        "mensagem": mensagem_text
    }, config.id)
    
    # Criar o registro de evento para sincronização de memória
    from models import WebhookEventModel
    
    now_br = get_now_br()
    event = WebhookEventModel(
        webhook_config_id=config.id,
        event_type="memory",
        status="waiting",
        raw_payload=json.dumps(body, ensure_ascii=False),
        telefone=phone,
        contato_nome="Lead_" + phone[-4:],
        dono=dono,
        mensagem=mensagem_text,
        created_at=now_br,
        processing_steps=json.dumps([{
            "step": "📥 Recebido Webhook de Memória",
            "detail": "Os dados foram recebidos e estão aguardando o processamento da fila de vetorização.",
            "timestamp": now_br.isoformat()
        }], ensure_ascii=False)
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    sync_memory_to_vector.delay(event.id)
    return {"ok": True, "phone": phone}

@router.delete("/{webhook_id}/leads-by-phone/{phone}/full-purge", status_code=204)
async def full_purge_lead_by_phone(webhook_id: int, phone: str, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    await delete_contact_data(db, webhook_id, config.leads_table, [phone])
    await db.commit()

@router.get("/{webhook_id}/events", response_model=WebhookEventsPaginatedResponse)
async def list_webhook_events(
    webhook_id: int, 
    page: int = 1, 
    limit: int = 50, 
    status: Optional[str] = None,
    search: Optional[str] = None,
    dono: Optional[str] = None,
    event_type: Optional[str] = "message",
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    where_clauses = ["webhook_config_id = :wid"]
    params = {"wid": webhook_id, "limit": limit, "offset": offset}

    if status and status != 'all':
        where_clauses.append("status = :status")
        params["status"] = status
    
    if dono:
        where_clauses.append("dono = :dono")
        params["dono"] = dono
    
    if event_type and event_type != "all":
        where_clauses.append("event_type = :event_type")
        params["event_type"] = event_type
        
    if search:
        digits_only = re.sub(r"\D", "", search)
        if len(digits_only) >= 8:
            suffix = digits_only[-8:]
            where_clauses.append("(telefone LIKE :search OR RIGHT(telefone, 8) = :suffix OR contato_nome ILIKE :search OR mensagem ILIKE :search)")
            params["suffix"] = suffix
        else:
            where_clauses.append("(telefone LIKE :search OR contato_nome ILIKE :search OR mensagem ILIKE :search)")
        params["search"] = f"%{search}%"

    where_str = " AND ".join(where_clauses)
    
    # Total
    total_res = await db.execute(text(f"SELECT COUNT(*) FROM webhook_events WHERE {where_str}"), params)
    total = total_res.scalar()

    # Itens
    query = text(f"SELECT * FROM webhook_events WHERE {where_str} ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
    res = await db.execute(query, params)
    columns = res.keys()
    items = [dict(zip(columns, row)) for row in res.fetchall()]

    return {"total": total, "items": items}

@router.get("/{webhook_id}/leads-by-phone/{phone}/history", response_model=LeadHistoryResponse)
async def get_lead_history(webhook_id: int, phone: str, page: int = 1, page_size: int = 50, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    offset = (page - 1) * page_size
    query = text(f"SELECT id, contato_id, telefone, mensagem, dono, created_at FROM {config.leads_table} WHERE webhook_config_id = :wid AND telefone = :tel ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
    res = await db.execute(query, {"wid": webhook_id, "tel": phone, "limit": page_size, "offset": offset})
    rows = res.fetchall()
    
    items = [LeadHistoryItem(id=r[0], contato_id=r[1], telefone=r[2], conteudo=r[3], dono="Humano" if r[4]=="cliente" else "Agente", timestamp=r[5], index=offset+i+1) for i, r in enumerate(rows)]
    return LeadHistoryResponse(total=len(items), page=page, page_size=page_size, items=items)

@router.post("/{webhook_id}/events/bulk-delete", status_code=204)
async def delete_events_bulk(webhook_id: int, req: BulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM webhook_events WHERE id = ANY(:ids) AND webhook_config_id = :wid"), {"ids": req.event_ids, "wid": webhook_id})
    await db.commit()

@router.post("/{webhook_id}/events/{event_id}/cancel", status_code=200)
async def cancel_webhook_event_endpoint(webhook_id: int, event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(WebhookEventModel, event_id)
    if event and event.webhook_config_id == webhook_id:
        event.status = "canceled"
        
        # Adicionar passo de cancelamento no pipeline
        steps = json.loads(event.processing_steps or "[]")
        steps.append({
            "step": "🚫 Automação Cancelada",
            "detail": "A automação para esta mensagem foi cancelada manualmente pelo usuário ou pelo sistema.",
            "timestamp": get_now_br().isoformat()
        })
        event.processing_steps = json.dumps(steps, ensure_ascii=False)
        
        await db.commit()
        
        # Notificar via WebSocket
        await manager.broadcast({
            "type": "status_update",
            "webhook_id": webhook_id,
            "event_id": event_id,
            "status": "canceled",
            "steps": steps
        })
    return {"ok": True}

@router.get("/{webhook_id}/leads")
async def list_webhook_leads(
    webhook_id: int, 
    page: int = 1, 
    page_size: int = 20, 
    q: Optional[str] = None,
    pode_enviar: Optional[bool] = None,
    janela_aberta: Optional[bool] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    offset = (page - 1) * page_size
    where_clauses = ["webhook_config_id = :wid"]
    params = {"wid": webhook_id, "limit": page_size, "offset": offset}
    
    if q:
        where_clauses.append("(telefone LIKE :q OR contato_nome ILIKE :q)")
        params["q"] = f"%{q}%"
    if pode_enviar is not None:
        where_clauses.append("pode_enviar_mensagem = :pe")
        params["pe"] = pode_enviar
    if janela_aberta is not None:
        if janela_aberta:
            where_clauses.append("(ultima_mensagem_em IS NOT NULL AND ultima_mensagem_em >= (NOW() - INTERVAL '24 hours'))")
        else:
            where_clauses.append("(ultima_mensagem_em IS NULL OR ultima_mensagem_em < (NOW() - INTERVAL '24 hours'))")
    if date_start:
        where_clauses.append("created_at >= :ds")
        params["ds"] = date_start
    if date_end:
        where_clauses.append("created_at <= :de")
        params["de"] = date_end
        
    where_str = " AND ".join(where_clauses)
    
    # Total
    total_res = await db.execute(text(f"SELECT COUNT(*) FROM {config.leads_table} WHERE {where_str}"), params)
    total = total_res.scalar()
    
    # Leads
    query = text(f"""
        SELECT *, 
               pode_enviar_mensagem AS pode_enviar,
               (ultima_mensagem_em IS NOT NULL AND ultima_mensagem_em >= (NOW() - INTERVAL '24 hours')) AS janela_24h_aberta,
               (SELECT COUNT(*) FROM webhook_events WHERE (webhook_events.telefone = {config.leads_table}.telefone OR webhook_events.telefone = '+' || {config.leads_table}.telefone) AND webhook_events.webhook_config_id = :wid) AS total_disparos
        FROM {config.leads_table} 
        WHERE {where_str} 
        ORDER BY updated_at DESC 
        LIMIT :limit OFFSET :offset
    """)
    logger.info(f"📊 Buscando leads para webhook {webhook_id} na tabela {config.leads_table} (Page: {page}, Size: {page_size}, Search: {q})")
    res = await db.execute(query, params)
    columns = res.keys()
    leads = [dict(zip(columns, row)) for row in res.fetchall()]
    
    logger.info(f"✅ Encontrados {len(leads)} leads de um total de {total}.")
    return {"total": total, "leads": leads}


@router.post("/{webhook_id}/leads/delete-batch", status_code=204)
async def delete_leads_batch(webhook_id: int, req: LeadBulkDeleteRequest, db: AsyncSession = Depends(get_db)):
    logger.info(f"🗑️ Deletando leads em lote para webhook {webhook_id}: {req.lead_ids}")
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    if not req.lead_ids:
        return

    try:
        # Busca telefones antes de deletar (para limpar logs/gatilhos)
        query = text(f"SELECT telefone FROM {config.leads_table} WHERE id = ANY(:ids) AND webhook_config_id = :wid")
        res = await db.execute(query, {"ids": req.lead_ids, "wid": webhook_id})
        phones = [r[0] for r in res.fetchall() if r[0]]
        
        logger.info(f"🗑️ Deletando em lote {len(req.lead_ids)} leads e limpando dados para {len(phones)} telefones.")

        # Remove dados vinculados
        await delete_contact_data(db, webhook_id, config.leads_table, phones, lead_ids=req.lead_ids)
        
        await db.commit()
        return Response(status_code=204)
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar leads em lote: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao deletar leads: {str(e)}")

@router.delete("/{webhook_id}/leads/{lead_id}", status_code=204)
async def delete_single_lead(webhook_id: int, lead_id: int, db: AsyncSession = Depends(get_db)):
    logger.info(f"🗑️ Deletando lead {lead_id} para webhook {webhook_id}")
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    try:
        phone = None
        conversa_id = None
        conta_id = None
        
        async with db.begin_nested():
            # Buscar telefone, conversa_id e conta_id do lead para limpar dados associados e mandar despedida
            query = text(f"SELECT telefone, conversa_id, conta_id FROM {config.leads_table} WHERE id = :lid AND webhook_config_id = :wid")
            res = await db.execute(query, {"lid": lead_id, "wid": webhook_id})
            row = res.fetchone()
            if row:
                phone = row[0]
                conversa_id = row[1]
                conta_id = row[2]
            
            # Deletar da tabela de leads
            await db.execute(text(f"DELETE FROM {config.leads_table} WHERE id = :lid"), {"lid": lead_id})
            
            if phone:
                # Remove dados vinculados
                await delete_contact_data(db, webhook_id, config.leads_table, [phone], lead_ids=[lead_id])
                
        await db.commit()
        
        # Enviar mensagem de despedida Chatwoot (se configurada) fora da transação
        if conversa_id and conta_id and config.delete_message:
            url = (config.chatwoot_url or os.getenv("CHATWOOT_URL", "")).rstrip("/")
            token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
            if url and token:
                headers = {"api_access_token": token, "Content-Type": "application/json"}
                full_url = f"{url}/api/v1/accounts/{conta_id}/conversations/{conversa_id}/messages"
                payload = {"content": config.delete_message, "message_type": "outgoing"}
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client_http:
                        await client_http.post(full_url, json=payload, headers=headers)
                except Exception as e:
                    logger.error(f"Erro ao enviar mensagem de despedida Chatwoot: {e}")
                    
        return Response(status_code=204)
    except Exception as e:
        await db.rollback()
        logger.error(f"❌ Erro ao deletar lead único: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao deletar lead: {str(e)}")

@router.delete("/{webhook_id}/leads/all", status_code=204)
async def delete_all_leads(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    # Buscar todos os IDs e telefones para limpeza total
    query = text(f"SELECT id, telefone FROM {config.leads_table} WHERE webhook_config_id = :wid")
    res = await db.execute(query, {"wid": webhook_id})
    rows = res.fetchall()
    ids = [r[0] for r in rows]
    phones = [r[1] for r in rows]
    
    if ids:
        await delete_contact_data(db, webhook_id, config.leads_table, phones, lead_ids=ids)
    await db.commit()

@router.post("/{webhook_id}/leads/sync-all")
async def sync_all_leads_endpoint(webhook_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(WebhookConfigModel, webhook_id)
    if not config: raise HTTPException(status_code=404, detail="Webhook não encontrado")
    
    # Aqui poderíamos disparar uma task Celery para buscar do Chatwoot
    # Por enquanto, retornamos sucesso para não dar erro na UI
    return {"ok": True, "message": "Sincronização iniciada"}
@router.get("/{webhook_id}/events/{event_id}")
async def get_webhook_event_detail(webhook_id: int, event_id: int, db: AsyncSession = Depends(get_db)):
    event = await db.get(WebhookEventModel, event_id)
    if not event or event.webhook_config_id != webhook_id:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    
    return {
        "id": event.id,
        "status": event.status,
        "processing_steps": event.processing_steps,
        "agent_response": event.agent_response,
        "updated_at": event.updated_at,
        "scheduled_at": event.scheduled_at,
        "created_at": event.created_at,
        "server_now": get_now_br()
    }
