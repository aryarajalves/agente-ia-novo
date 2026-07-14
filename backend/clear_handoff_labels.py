import asyncio
from database import get_db
from sqlalchemy import text

async def run():
    async for db in get_db():
        print("Limpando etiquetas de handoff (remover/adicionar) do webhook ID = 1...")
        await db.execute(text("""
            UPDATE webhook_configs 
            SET handoff_labels_to_add = '[]',
                handoff_labels_to_remove = '[]',
                ai_handoff_labels_to_add = '[]',
                ai_handoff_labels_to_remove = '[]'
            WHERE id = 1
        """))
        await db.commit()
        print("Atualização concluída com sucesso!")

if __name__ == "__main__":
    asyncio.run(run())
