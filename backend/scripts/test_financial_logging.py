import asyncio
import os
import sys
from datetime import datetime, timezone

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from worker_core.handlers.whatsapp import handle_whatsapp_event

async def test_template_delivery_logging():
    print("🚀 Testing Template Delivery Financial Logging...")
    db = SessionLocal()
    
    try:
        # 1. Setup Mock Data
        # We need a WebhookConfig, a ScheduledTrigger, and a MessageStatus
        config = db.query(models.WebhookConfigModel).first()
        if not config:
            print("❌ No WebhookConfig found to test with.")
            return

        # Create a mock trigger
        from models import ScheduledTrigger # Assuming it exists in the runtime namespace
        
        # We'll use raw SQL to find if the table exists and create a test trigger if we can't find the model
        # Actually, let's just find an existing trigger if possible
        trigger = db.query(models.ScheduledTrigger).filter(models.ScheduledTrigger.status == 'completed').first()
        if not trigger:
            print("❌ No completed ScheduledTrigger found to test with. Creating a dummy one...")
            trigger = models.ScheduledTrigger(
                client_id=1,
                integration_id=config.id,
                contact_phone="5585996123586",
                template_name="test_template",
                status="completed"
            )
            db.add(trigger)
            db.commit()
            db.refresh(trigger)

        # Create a mock MessageStatus
        wamid = f"test-wamid-{datetime.now().timestamp()}"
        msg_status = models.MessageStatus(
            trigger_id=trigger.id,
            message_id=wamid,
            phone_number=trigger.contact_phone,
            status="sent",
            message_type="TEMPLATE"
        )
        db.add(msg_status)
        db.commit()
        db.refresh(msg_status)

        # 2. Simulate Webhook Status Update (Delivered)
        payload = {
            "entry": [{
                "changes": [{
                    "value": {
                        "statuses": [{
                            "id": f"wamid.{wamid}",
                            "status": "delivered",
                            "recipient_id": trigger.contact_phone,
                            "timestamp": str(int(datetime.now().timestamp())),
                            "pricing": {
                                "billable": True,
                                "category": "marketing"
                            }
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }

        print(f"📦 Sending mock delivered status for wamid: {wamid}")
        await handle_whatsapp_event(payload)

        # 3. Verify InteractionLog
        db.rollback() # Clear cache
        log = db.query(models.InteractionLog).filter(
            models.InteractionLog.session_id == trigger.contact_phone,
            models.InteractionLog.user_message.like("%[DISPARO]%")
        ).order_by(models.InteractionLog.timestamp.desc()).first()

        if log:
            print(f"✅ Success! InteractionLog created for template dispatch.")
            print(f"   - Agent ID: {log.agent_id}")
            print(f"   - Cost BRL: {log.cost_brl}")
            print(f"   - Message: {log.user_message}")
        else:
            print("❌ Failure: InteractionLog NOT found after delivery status update.")

    except Exception as e:
        print(f"💥 Error during test: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_template_delivery_logging())
