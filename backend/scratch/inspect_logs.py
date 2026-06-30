import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@banco-agente-local:5432/ai_agent_db")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        r = await conn.execute(text("SELECT id, session_id, user_message, agent_response, cached_tokens, input_tokens, cost_brl, debug_info, model_used FROM interaction_logs ORDER BY id DESC LIMIT 15"))
        rows = r.fetchall()
        print(f"Total rows: {len(rows)}")
        for row in rows:
            import json
            dbg = {}
            try:
                dbg = json.loads(row[7]) if row[7] else {}
            except:
                pass
            pre_router_info = dbg.get("pre_router", {})
            pr_usage = pre_router_info.get("_usage", {})
            print(f"ID: {row[0]}, Msg: {row[2]}, Model: {row[8]}, Cached: {row[4]}, In: {row[5]}, Cost: R$ {row[6]:.4f}")
            if pr_usage:
                print(f"   ↳ Pre-Router: {pr_usage.get('prompt_tokens', 0)} In / {pr_usage.get('completion_tokens', 0)} Out - Model: {pre_router_info.get('_model_used')}")

if __name__ == "__main__":
    asyncio.run(main())
