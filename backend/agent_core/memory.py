import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import UserMemoryModel
from .clients import get_openai_client

async def fetch_user_memory(db: AsyncSession, session_id: str) -> str:
    if not db or not session_id: return ""
    try:
        result = await db.execute(
            select(UserMemoryModel)
            .where(UserMemoryModel.session_id == session_id)
            .order_by(UserMemoryModel.updated_at.desc())
        )
        memories = result.scalars().all()
        if not memories: return ""
        facts_text = "\n# MEMÓRIA ESTRUTURADA:\n"
        for i, m in enumerate(memories):
            prefix = "⭐ [PRIORITÁRIO]" if i == 0 else "-"
            facts_text += f"{prefix} {m.key}: {m.value}\n"
        return facts_text
    except Exception as e:
        print(f"⚠️ fetch_user_memory error: {e}")
        return ""

async def update_user_memory(db: AsyncSession, session_id: str, new_message: str, response_text: str):
    if not db or not session_id or not new_message: return
    client = get_openai_client()
    if not client: return
    prompt = f"Extraia fatos estruturados importantes do diálogo:\nUsuário: {new_message}\nAgente: {response_text}\nRetorne JSON plano com as chaves sendo o fato."
    try:
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Extrator de dados estruturados. Retorne APENAS JSON."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}, temperature=0
        )
        facts = json.loads(res.choices[0].message.content)
        if not facts: return
        for key, value in facts.items():
            stmt = select(UserMemoryModel).where(UserMemoryModel.session_id == session_id, UserMemoryModel.key == key)
            existing_res = await db.execute(stmt)
            existing = existing_res.scalars().first()
            if existing:
                existing.value = str(value)
                existing.source_message = new_message
            else:
                db.add(UserMemoryModel(session_id=session_id, key=key, value=str(value), source_message=new_message))
        await db.commit()
    except Exception as e:
        print(f"⚠️ update_user_memory error: {e}")
