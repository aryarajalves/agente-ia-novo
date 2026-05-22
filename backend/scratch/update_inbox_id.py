from database import engine_sync
from sqlalchemy import text

with engine_sync.connect() as conn:
    conn.execute(text("UPDATE webhook_configs SET chatwoot_inbox_id = '4' WHERE id = 113"))
    conn.commit()
    print("Updated chatwoot_inbox_id to '4'")
