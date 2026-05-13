import asyncio
from ..utils import logger, MESSAGE_DELAY
from services.bulk import process_bulk_send, process_bulk_funnel

async def handle_bulk_send(data: dict):
    """Processa mensagens de disparo em massa da fila 'zapvoice_bulk_sends'"""
    trigger_id = data.get('trigger_id')
    logger.info(f"📨 Recebido Job de Bulk Send: {trigger_id}")
    
    try:
        if data.get("type") == "funnel_bulk":
            await process_bulk_funnel(
                trigger_id=trigger_id,
                funnel_id=data.get("funnel_id"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1)
            )
        else:
            await process_bulk_send(
                trigger_id=trigger_id,
                template_name=data.get("template_name"),
                contacts=data.get("contacts"),
                delay=data.get("delay", 5),
                concurrency=data.get("concurrency", 1),
                language=data.get("language", "pt_BR"),
                components=data.get("components"),
                direct_message=data.get("direct_message"),
                direct_message_params=data.get("direct_message_params")
            )
        logger.info(f"✅ Job de Bulk Send {trigger_id} concluído!")
    except Exception as e:
        logger.error(f"❌ Erro ao processar Bulk Send: {e}")
    finally:
        if MESSAGE_DELAY > 0:
            await asyncio.sleep(MESSAGE_DELAY)
