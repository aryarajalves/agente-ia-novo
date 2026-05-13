import json
import httpx
from datetime import datetime, timezone
from ..utils import logger
from database import SessionLocal
import models
from .chatwoot import delayed_sync_chatwoot_name
from ..logic.meta_status import process_meta_status_update
from ..logic.funnel_trigger import check_and_trigger_funnel
from chatwoot_client import ChatwootClient

async def handle_whatsapp_event(data: dict):
    """Processa eventos crus do Webhook da Meta."""
    try:
        entry = data.get("entry", [])
        if not entry: return
        db = SessionLocal()
        try:
            for item in entry:
                for change in item.get("changes", []):
                    value = change.get("value", {})
                    
                    # 1. STATUS UPDATE
                    for status_obj in value.get("statuses", []):
                        await process_meta_status_update(db, status_obj)

                    # 2. MESSAGES (Interações)
                    contacts_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in value.get("contacts", [])}
                    for msg in value.get("messages", []):
                        from_phone = msg.get("from")
                        msg_type = msg.get("type")
                        profile_name = contacts_map.get(from_phone)
                        
                        # Sync nome atrasado
                        pnid = value.get("metadata", {}).get("phone_number_id")
                        target_client_id = 1
                        if pnid:
                            conf = db.query(models.AppConfig).filter(models.AppConfig.key == "WA_PHONE_NUMBER_ID", models.AppConfig.value == str(pnid)).first()
                            if conf: target_client_id = conf.client_id
                        if profile_name:
                            import asyncio
                            asyncio.create_task(delayed_sync_chatwoot_name(target_client_id, from_phone, profile_name))

                        # Extração de input
                        user_input = ""
                        if msg_type == 'button': user_input = msg.get("button", {}).get("text", "")
                        elif msg_type == 'interactive':
                            r = msg.get("interactive", {})
                            user_input = r.get("button_reply", {}).get("title") or r.get("list_reply", {}).get("title") or ""
                        elif msg_type == 'text': user_input = msg.get("text", {}).get("body", "")
                        
                        if user_input:
                            # Garantir conversa no Chatwoot
                            cw = ChatwootClient(client_id=target_client_id)
                            inbox_id = await cw.get_default_whatsapp_inbox()
                            conv_id = await cw.ensure_conversation(from_phone, profile_name or from_phone, inbox_id)
                            
                            # Sync mensagem entrada para Chatwoot
                            await cw.send_message(conv_id, user_input, message_type="incoming")
                            
                            # 🧠 TRIGGER AI MEMORY (Incoming Message)
                            try:
                                from services.ai_memory import notify_ai_memory
                                await notify_ai_memory(
                                    client_id=target_client_id,
                                    phone=from_phone,
                                    content=user_input,
                                    msg_type="text",
                                    direction="incoming"
                                )
                            except: pass

                            # Gatilho de Funil / Bloqueio
                            await check_and_trigger_funnel(db, target_client_id, from_phone, user_input, profile_name, conv_id)

        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ Erro fatal WhatsApp Event: {e}")
