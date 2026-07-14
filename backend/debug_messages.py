import asyncio
from database import get_db
from sqlalchemy import text

async def run():
    async for db in get_db():
        print("=== WEBHOOK CONFIGS HANDOFF LABELS ===")
        res = await db.execute(text("SELECT id, handoff_labels_to_add, handoff_labels_to_remove, ai_handoff_labels_to_add, ai_handoff_labels_to_remove FROM webhook_configs WHERE id = 1"))
        for r in res.fetchall():
            wid, add_h, rem_h, add_r, rem_r = r
            print(f"ID={wid}")
            print(f"  handoff_labels_to_add: {add_h}")
            print(f"  handoff_labels_to_remove: {rem_h}")
            print(f"  ai_handoff_labels_to_add: {add_r}")
            print(f"  ai_handoff_labels_to_remove: {rem_r}")

if __name__ == "__main__":
    asyncio.run(run())
