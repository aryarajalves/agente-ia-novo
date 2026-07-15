import sys
import os
import asyncio
from sqlalchemy import select

# Adiciona o diretório principal ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import async_session
from models import GoogleTokensModel, AgentConfigModel, CalendarEventModel
from agent_core.tools.handlers.google import handle_google_calendar

async def run_test():
    print("🚀 Iniciando teste de criação de agendamento...")
    
    # Criar sessão assíncrona
    async with async_session() as db:
        # Buscar o primeiro agente configurado
        result_agent = await db.execute(select(AgentConfigModel))
        agent = result_agent.scalars().first()
        agent_id = agent.id if agent else 1
        print(f"🤖 Usando Agent ID: {agent_id}")
        
        # Argumentos para criar o agendamento
        tool_args = {
            "acao": "criar",
            "titulo": "Mentoria Especial - Aryaraj Alves - Google Meet",
            "inicio": "2026-07-16T16:00:00-03:00",
            "fim": "2026-07-16T17:00:00-03:00",
            "descricao": "Agendamento de Mentoria homologado via Script de Teste.",
            "local": "Google Meet",
            "convidados": "aryarajcrypto@gmail.com",
            "cor": "azul"
        }
        
        # Variáveis de contexto simulando o lead do WhatsApp
        context_variables = {
            "agent_id": agent_id,
            "contact_phone": "5585999999999",
            "contact_name": "Aryaraj Alves Fernandes"
        }
        
        try:
            # Executar a ferramenta
            response = await handle_google_calendar(db, context_variables, tool_args)
            print("\n📥 Retorno oficial do Handler (Pipeline):")
            print("-" * 60)
            print(response)
            print("-" * 60)
            
            # Validar se gravou no banco de dados local
            await asyncio.sleep(1) # Aguarda gravação
            result_evt = await db.execute(
                select(CalendarEventModel).order_by(CalendarEventModel.created_at.desc())
            )
            latest_evt = result_evt.scalars().first()
            if latest_evt:
                print("\n💾 Registro persistido no banco local:")
                print(f"ID Local: {latest_evt.id}")
                print(f"Google Event ID: {latest_evt.event_id}")
                print(f"Telefone do Lead: {latest_evt.telefone}")
                print(f"Email: {latest_evt.email}")
                print(f"Título: {latest_evt.titulo}")
                print(f"Data/Hora: {latest_evt.data_horario}")
            else:
                print("\n❌ Alerta: Nenhum evento encontrado na tabela local 'calendar_events'.")
                
        except Exception as e:
            print(f"❌ Erro ao rodar teste: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())
