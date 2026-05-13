import logging
from datetime import datetime, timezone
from sqlalchemy import text
import models
from services.triggers_service import increment_delivery_stats, increment_read_stats, increment_failed_stats
from rabbitmq_client import rabbitmq

logger = logging.getLogger("Worker.MetaStatus")

async def process_meta_status_update(db, status_obj):
    msg_id = status_obj.get("id")
    status = status_obj.get("status")
    recipient = status_obj.get("recipient_id")
    clean_msg_id = msg_id.replace("wamid.", "") if msg_id else msg_id

    # Retry loop for consistency
    message_record = None
    import asyncio
    for attempt in range(10):
        message_record = db.query(models.MessageStatus).filter(
            (models.MessageStatus.message_id == clean_msg_id) | 
            (models.MessageStatus.message_id == msg_id)
        ).with_for_update().first()
        if message_record: break
        await asyncio.sleep(0.5)
        db.rollback()

    if not message_record:
        logger.warning(f"⚠️ MessageStatus não encontrado: {msg_id}")
        return

    if message_record.status != status:
        message_record.status = status
        message_record.updated_at = datetime.now(timezone.utc)
        
        trigger = message_record.trigger
        if trigger:
            if status in ['delivered', 'read']:
                pricing = status_obj.get("pricing", {})
                cat = pricing.get("category", "").lower()
                cost = 0.0
                if message_record.message_type != 'FREE_MESSAGE':
                    prices = {"marketing": 0.35, "utility": 0.07, "authentication": 0.15}
                    cost = trigger.cost_per_unit or prices.get(cat, 0.0)
                
                increment_delivery_stats(db, trigger, message_record, cost)
                
                # Log Financeiro
                if cost > 0:
                    agent_id = getattr(trigger, "agent_id", None)
                    new_log = models.InteractionLog(
                        agent_id=agent_id, session_id=recipient,
                        user_message=f"[DISPARO] {trigger.template_name}",
                        agent_response=f"[{status.capitalize()}]", model_used="Meta API",
                        cost_brl=cost, timestamp=datetime.now(timezone.utc)
                    )
                    db.add(new_log)
            
            elif status == 'read':
                increment_read_stats(db, trigger.id)
            elif status == 'failed':
                increment_failed_stats(db, trigger.id)
                errors = status_obj.get("errors")
                if errors: message_record.failure_reason = f"{errors[0].get('code')}: {errors[0].get('title')}"
        
        db.commit()
        # Notificação de progresso
        if trigger:
            await rabbitmq.publish_event("bulk_progress", {
                "trigger_id": trigger.id, "status": trigger.status,
                "sent": trigger.total_sent, "delivered": trigger.total_delivered,
                "read": trigger.total_read, "failed": trigger.total_failed,
                "cost": trigger.total_cost
            })
