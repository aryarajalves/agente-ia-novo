from google_calendar import GoogleCalendarService
import json
import logging

logger = logging.getLogger(__name__)

async def handle_google_calendar(db, context_variables, tool_args):
    """
    Handler unificado para gerenciar o Google Calendar.
    """
    agent_id = context_variables.get("agent_id")
    if not agent_id:
        return "❌ Erro: ID do agente não encontrado no contexto."
        
    service = GoogleCalendarService(agent_id, db)
    
    acao = tool_args.get("acao", "").lower()
    
    try:
        if acao == "criar":
            res = await service.create_event(
                summary=tool_args.get("titulo"),
                start_time=tool_args.get("inicio"),
                end_time=tool_args.get("fim"),
                description=tool_args.get("descricao"),
                location=tool_args.get("local"),
                attendees=tool_args.get("convidados"),
                color=tool_args.get("cor"),
                recurrence=tool_args.get("recorrencia")
            )
            return f"✅ Evento criado com sucesso! Link: {res.get('htmlLink')}"
            
        elif acao == "listar":
            # Suporta busca por termos ou apenas listar próximos
            query = tool_args.get("busca") or tool_args.get("titulo")
            events = await service.list_events(
                max_results=tool_args.get("max_resultados", 10),
                time_min=tool_args.get("inicio"),
                time_max=tool_args.get("fim"),
                q=query
            )
            
            if not events:
                return "📅 Nenhum evento encontrado para os critérios informados."
                
            resp = f"📅 Encontrei {len(events)} eventos:\n"
            for e in events:
                start = e['start'].get('dateTime', e['start'].get('date'))
                resp += f"- {e['summary']} | {start} | ID: {e['id']}\n"
            return resp
            
        elif acao == "atualizar":
            event_id = tool_args.get("event_id")
            if not event_id:
                return "❌ Erro: O ID do evento (event_id) é obrigatório para atualizar."
                
            res = await service.update_event(
                event_id=event_id,
                summary=tool_args.get("titulo"),
                start_time=tool_args.get("inicio"),
                end_time=tool_args.get("fim"),
                description=tool_args.get("descricao"),
                location=tool_args.get("local"),
                attendees=tool_args.get("convidados"),
                color=tool_args.get("cor")
            )
            return f"✅ Evento '{res.get('summary')}' atualizado com sucesso!"
            
        elif acao == "cancelar" or acao == "deletar":
            event_id = tool_args.get("event_id")
            if not event_id:
                return "❌ Erro: O ID do evento (event_id) é obrigatório para cancelar."
                
            await service.delete_event(event_id)
            return "✅ Evento removido com sucesso do calendário."
            
        return f"❌ Erro: Ação '{acao}' não reconhecida. Use: criar, listar, atualizar ou cancelar."
        
    except Exception as e:
        logger.error(f"Erro no Google Calendar Handler: {e}")
        return f"❌ Houve um erro ao acessar o Google Calendar: {str(e)}"
