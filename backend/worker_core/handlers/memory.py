import httpx
from ..utils import logger
from database import SessionLocal
import models
from config_loader import get_setting

async def handle_agent_memory_webhook(data: dict):
    """Processa o envio de dados para o Webhook de Memória do Agente."""
    client_id = data.get("client_id")
    phone = data.get("contact_phone")
    trigger_id = data.get("trigger_id")
    
    db = SessionLocal()
    try:
        webhook_url = get_setting("AGENT_MEMORY_WEBHOOK_URL", "", client_id=client_id)
        if not webhook_url:
            if trigger_id:
                db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.phone_number == phone
                ).update({"memory_webhook_status": "not_configured"})
                db.commit()
            return

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=data)
            status = "sent" if response.status_code < 400 else "failed"
            error = f"HTTP {response.status_code}" if status == "failed" else None
            
            if trigger_id:
                db.query(models.MessageStatus).filter(
                    models.MessageStatus.trigger_id == trigger_id,
                    models.MessageStatus.phone_number == phone
                ).update({"memory_webhook_status": status, "memory_webhook_error": error})
                if status == "sent":
                    db.query(models.ScheduledTrigger).filter(
                        models.ScheduledTrigger.id == trigger_id
                    ).update({"total_memory_sent": models.ScheduledTrigger.total_memory_sent + 1})
                db.commit()
            logger.info(f"✅ Webhook memória {phone}: {status}")
    except Exception as e:
        logger.error(f"❌ Erro webhook memória {phone}: {e}")
    finally:
        db.close()
