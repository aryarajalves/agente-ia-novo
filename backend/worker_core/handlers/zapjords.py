import asyncio
from ..utils import logger, get_semaphore
from database import SessionLocal
from zapjords_client import ZapJordsClient
from services.triggers_service import increment_private_note_stats

async def handle_zapjords_private_message(data: dict):
    """Cria uma mensagem privada no ZapJords para um contato."""
    client_id = data.get("client_id")
    phone = data.get("phone")
    message = data.get("message")
    trigger_id = data.get("trigger_id")
    delay = 1
    
    sem = get_semaphore("private_notes", 10)

    try:
        async with sem:
            if not message: return
            zapjords = ZapJordsClient(client_id=client_id)
            inbox_id = await zapjords.get_default_whatsapp_inbox()
            if not inbox_id: return

            conversation_id = await zapjords.ensure_conversation(
                phone_number=phone, name=phone, inbox_id=inbox_id
            )
            
            if conversation_id:
                await zapjords.send_message(conversation_id, message, private=True)
                with SessionLocal() as db:
                    increment_private_note_stats(db, trigger_id)
                logger.info(f"✅ Nota privada enviada para {phone}")
            
            await asyncio.sleep(delay)
    except Exception as e:
        logger.error(f"❌ Erro nota privada {phone}: {e}")
        raise

async def delayed_sync_zapjords_name(client_id: int, phone: str, name: str, delay: int = 15):
    """Aguarda X segundos e sincroniza o nome no ZapJords."""
    if not name or not phone: return
    await asyncio.sleep(delay)
    try:
        zapjords = ZapJordsClient(client_id=client_id)
        clean_phone = "".join(filter(str.isdigit, phone))
        search_res = await zapjords.search_contact(f"+{clean_phone}")
        if not (search_res and search_res.get("payload")):
            search_res = await zapjords.search_contact(clean_phone)

        if search_res and search_res.get("payload"):
            contact = search_res["payload"][0]
            if contact.get("name") != name:
                await zapjords.update_contact(contact["id"], {"name": name})
                logger.info(f"🔄 Nome atualizado para {phone}")
    except Exception as e:
        logger.error(f"❌ Erro sync nome {phone}: {e}")
