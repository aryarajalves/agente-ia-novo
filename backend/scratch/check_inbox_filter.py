from database import engine_sync
from sqlalchemy import text

with engine_sync.connect() as conn:
    row = conn.execute(text("SELECT id, chatwoot_inbox_id FROM webhook_configs WHERE id = 113")).fetchone()
    if row:
        print("Webhook:", row)
