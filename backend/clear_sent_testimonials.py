import sys
import asyncio
from database import get_db
from sqlalchemy import text

# Uso (dentro do container do backend):
#   docker exec backend-agente-local python clear_sent_testimonials.py                -> limpa TODO o histórico (todos os telefones)
#   docker exec backend-agente-local python clear_sent_testimonials.py 5511999999999   -> limpa só o histórico de um telefone específico
#
# Motivo: o histórico de depoimentos já enviados (tabela sent_testimonials) é rastreado por
# telefone e é intencionalmente independente do "Reset" da sessão no Chat Playground (que só
# cria um novo session_id e limpa a memória da conversa). Como o Playground usa um telefone de
# teste fixo (variável de contexto global "contact_phone", ex: 5511999999999) em toda
# requisição, o histórico de envio se acumula entre testes mesmo após resetar a sessão. Isso é
# o comportamento correto em produção (não reenviar o mesmo depoimento para o mesmo contato
# real), mas atrapalha testes repetidos no Playground — este script existe só para limpar esse
# histórico manualmente durante testes.

async def run(phone: str = None):
    async for db in get_db():
        if phone:
            print(f"Limpando histórico de depoimentos enviados para o telefone {phone}...")
            await db.execute(text("DELETE FROM sent_testimonials WHERE phone = :phone"), {"phone": phone})
        else:
            print("Limpando TODO o histórico de depoimentos enviados (todos os telefones)...")
            await db.execute(text("DELETE FROM sent_testimonials"))
        await db.commit()
        print("Limpeza concluída com sucesso!")

if __name__ == "__main__":
    phone_arg = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(run(phone_arg))
