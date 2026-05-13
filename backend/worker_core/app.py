import asyncio
from rabbitmq_client import rabbitmq
from .utils import logger, PREFETCH_COUNT
from .handlers.bulk import handle_bulk_send
from .handlers.funnel import handle_funnel_execution
from .handlers.whatsapp import handle_whatsapp_event
from .handlers.chatwoot import handle_chatwoot_private_message
from .handlers.memory import handle_agent_memory_webhook

async def start_worker():
    """Inicia o worker e conecta às filas do RabbitMQ"""
    logger.info(f"👷 Iniciando ZapVoice Worker Modular | Prefetch: {PREFETCH_COUNT}")
    
    await rabbitmq.connect()
    
    # Configuração de Consumidores
    await rabbitmq.consume("zapvoice_bulk_sends", handle_bulk_send, prefetch_count=1)
    await rabbitmq.consume("agent_memory_webhook_queue", handle_agent_memory_webhook, prefetch_count=1)
    await rabbitmq.consume("whatsapp_events", handle_whatsapp_event, prefetch_count=20)
    await rabbitmq.consume("zapvoice_funnel_executions", handle_funnel_execution, prefetch_count=PREFETCH_COUNT)
    await rabbitmq.consume("chatwoot_private_messages", handle_chatwoot_private_message, prefetch_count=50, requeue_on_error=True)

    logger.info("🚀 Worker modular rodando e aguardando processamento...")
    
    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        logger.info("🛑 Worker parando...")
        await rabbitmq.close()
