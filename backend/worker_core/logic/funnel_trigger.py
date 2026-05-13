import logging
import zlib
from datetime import datetime, timezone, timedelta
from sqlalchemy import func, or_, text
import models
from utils import normalize_phone

logger = logging.getLogger("Worker.FunnelTrigger")

async def check_and_trigger_funnel(db, client_id, from_phone, user_input, profile_name, conv_id):
    user_input_clean = user_input.lower().strip()
    
    # 1. Bloqueio
    from config_loader import get_setting
    db_keywords = get_setting("AUTO_BLOCK_KEYWORDS", "", client_id=client_id)
    block_keywords = [k.strip().lower() for k in db_keywords.split(",") if k.strip()] or ["bloquear", "parar", "sair"]
    
    if any(k in user_input_clean for k in block_keywords):
        clean_phone = "".join(filter(str.isdigit, str(from_phone)))
        already = db.query(models.BlockedContact).filter(models.BlockedContact.client_id == client_id, models.BlockedContact.phone == clean_phone).first()
        if not already:
            db.add(models.BlockedContact(client_id=client_id, phone=clean_phone, name=profile_name, reason=f"Auto-bloqueio: {user_input}"))
            db.commit()
        return True # Foi bloqueio

    # 2. Match de Funil
    matched = db.query(models.Funnel).filter(
        models.Funnel.client_id == client_id,
        models.Funnel.is_active == True,
        or_(
            func.lower(models.Funnel.trigger_phrase) == user_input_clean,
            models.Funnel.trigger_phrase.ilike(f"%,{user_input_clean},%"),
            models.Funnel.trigger_phrase.ilike(f"{user_input_clean},%"),
            models.Funnel.trigger_phrase.ilike(f"%,{user_input_clean}")
        )
    ).first()

    if matched:
        # Idempotência (PG Advisory Lock)
        norm_phone = normalize_phone(from_phone)
        lock_id = zlib.adler32(f"lock_{client_id}_{norm_phone}_{matched.id}".encode()) & 0x7FFFFFFF
        db.execute(text("SELECT pg_advisory_xact_lock(:id)"), {"id": lock_id})

        limit = datetime.now(timezone.utc) - timedelta(seconds=30)
        existing = db.query(models.ScheduledTrigger).filter(
            models.ScheduledTrigger.client_id == client_id,
            models.ScheduledTrigger.funnel_id == matched.id,
            models.ScheduledTrigger.contact_phone.in_([from_phone, norm_phone]),
            models.ScheduledTrigger.created_at >= limit,
            models.ScheduledTrigger.status != 'cancelled'
        ).first()

        if not existing:
            new_trigger = models.ScheduledTrigger(
                client_id=client_id, funnel_id=matched.id,
                contact_phone=from_phone, contact_name=profile_name,
                conversation_id=conv_id, status='queued',
                scheduled_time=datetime.now(timezone.utc),
                template_name=f"Interação: {user_input}", is_bulk=False
            )
            db.add(new_trigger)
            db.commit()
            logger.info(f"🚀 Funil {matched.name} disparado para {from_phone}")
    return False
