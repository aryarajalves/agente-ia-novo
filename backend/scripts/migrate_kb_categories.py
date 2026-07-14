import asyncio
import sys
import os

# Adiciona o caminho raiz do backend ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import KnowledgeItemModel
from sqlalchemy import select

async def run():
    async for db in get_db():
        try:
            result = await db.execute(select(KnowledgeItemModel))
            items = result.scalars().all()
            updated_count = 0
            for item in items:
                cat = (item.category or '').lower().strip()
                question = (item.question or '').lower().strip()
                
                is_chunk_cat = cat in ['transcrição', 'upload']
                is_generic_question = question == 'trecho' or question.startswith('informação de')
                
                # Se tem categoria de chunk, mas tem uma pergunta real estruturada
                if is_chunk_cat and not is_generic_question:
                    item.category = "Geral"
                    updated_count += 1
            
            if updated_count > 0:
                await db.commit()
                print(f"MIGRAÇÃO CONCLUÍDA: {updated_count} itens atualizados para 'Geral' (QA).")
            else:
                print("MIGRAÇÃO: Nenhum item de conhecimento precisou de alteração.")
        except Exception as e:
            print(f"Erro na migração: {e}")
        break

if __name__ == "__main__":
    asyncio.run(run())
