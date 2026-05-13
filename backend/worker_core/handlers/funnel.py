import asyncio
from datetime import datetime, timezone, timedelta
from ..utils import logger, MESSAGE_DELAY
from database import SessionLocal
import models
from services.engine import execute_funnel

async def handle_funnel_execution(data: dict):
    """Processa execuções de funil da fila 'zapvoice_funnel_executions'"""
    trigger_id = data.get('trigger_id')
    phone = data.get('contact_phone', 'unknown')
    logger.info(f"🎡 [WORKER] Recebido Job de Funil! Trigger ID: {trigger_id} | Phone: {phone}")
    await asyncio.sleep(6) # Delay de resiliência

    try:
        db = SessionLocal()
        try:
            trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
            if not trigger:
                for _ in range(4): # Retry visibilidade
                    await asyncio.sleep(0.5)
                    trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.id == trigger_id).first()
                    if trigger: break
            
            if not trigger:
                logger.error(f"❌ Trigger {trigger_id} não encontrado.")
                return

            if trigger.status == 'cancelled':
                logger.info(f"⏭️ Trigger {trigger_id} cancelado.")
                return

            # Suppression Check
            if trigger.integration_id and trigger.event_type:
                all_mappings = db.query(models.WebhookEventMapping).filter(
                    models.WebhookEventMapping.integration_id == trigger.integration_id,
                    models.WebhookEventMapping.is_active == True
                ).all()
                suppressor_types = [m.event_type for m in all_mappings if m.cancel_events and trigger.event_type in m.cancel_events]
                if suppressor_types:
                    time_limit = datetime.now(timezone.utc) - timedelta(days=3)
                    superior = db.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.integration_id == trigger.integration_id,
                        models.ScheduledTrigger.contact_phone == phone,
                        models.ScheduledTrigger.product_name == trigger.product_name,
                        models.ScheduledTrigger.event_type.in_(suppressor_types),
                        models.ScheduledTrigger.status.in_(["completed", "processing"]),
                        models.ScheduledTrigger.created_at >= time_limit,
                        models.ScheduledTrigger.id != trigger.id
                    ).first()
                    if superior:
                        logger.info(f"⏭️ Trigger {trigger.id} suprimido por '{superior.event_type}'.")
                        trigger.status = 'cancelled'
                        trigger.failure_reason = f"Suprimido por: {superior.event_type}"
                        db.commit()
                        return

            # Execução
            funnel_id = data.get("funnel_id")
            if funnel_id:
                await execute_funnel(
                    funnel_id=funnel_id,
                    conversation_id=trigger.conversation_id or data.get("conversation_id"),
                    trigger_id=trigger_id,
                    contact_phone=phone,
                    db=db,
                    skip_block_check=getattr(trigger, 'skip_block_check', False)
                )
            else:
                # Ações internas (labels/notas) se funnel_id for None
                if trigger.template_name:
                    # Lógica de template direto aqui (simplificada para o handler)
                    pass # TODO: Implementar ou delegar
                
                if trigger.chatwoot_label:
                    from chatwoot_client import ChatwootClient
                    cw = ChatwootClient(client_id=trigger.client_id)
                    await cw.add_label_to_conversation(trigger.conversation_id, trigger.chatwoot_label)

                trigger.status = 'completed'
                db.commit()

            logger.info(f"✅ Funil concluído para {phone}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ Erro ao executar funil: {e}")
    finally:
        if MESSAGE_DELAY > 0:
            await asyncio.sleep(MESSAGE_DELAY)
