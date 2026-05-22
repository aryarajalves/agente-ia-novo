import os
from database import engine_sync
from sqlalchemy import text

with engine_sync.connect() as conn:
    row = conn.execute(text("SELECT id, name, chatwoot_url, chatwoot_api_token FROM webhook_configs WHERE id = 113")).fetchone()
    if row:
        print(f"Webhook {row[0]}: {row[1]}")
        print(f"  URL: {row[2]}")
        print(f"  Token length: {len(row[3]) if row[3] else None}")
        print(f"  Token matches env? {row[3] == os.getenv('CHATWOOT_API_TOKEN') if row[3] else False}")
