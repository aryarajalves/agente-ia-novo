from google_calendar import GoogleCalendarService
import json
import logging

logger = logging.getLogger(__name__)

async def handle_google_calendar(db, context_variables, tool_args):
    """
    Handler unificado para gerenciar o Google Calendar.
    """
    agent_id = context_variables.get("agent_id") if context_variables else None
    if not agent_id:
        from models import AgentConfigModel
        from sqlalchemy import select
        result_agent = await db.execute(select(AgentConfigModel.id))
        agent_id = result_agent.scalars().first()
        
    if not agent_id:
        return "❌ Erro: ID do agente não encontrado no contexto."
        
    service = GoogleCalendarService(agent_id, db)
    
    # Buscar configurações de cor e email do google_tokens
    from models import GoogleTokensModel
    from sqlalchemy import select
    result_tok = await db.execute(select(GoogleTokensModel).where(GoogleTokensModel.agent_id == agent_id))
    db_token = result_tok.scalars().first()
    if not db_token:
        # Fallback global
        result_tok = await db.execute(select(GoogleTokensModel).where(GoogleTokensModel.agent_id == None))
        db_token = result_tok.scalars().first()

    acao = tool_args.get("acao", "").lower()
    
    try:
        if acao == "criar":
            convidados_raw = tool_args.get("convidados") or ""
            convidados_list = [c.strip() for c in convidados_raw.split(",") if c.strip()] if isinstance(convidados_raw, str) else (convidados_raw or [])
            
            # Adicionar o e-mail do lead automaticamente por padrão
            user_email_to_add = None
            import re
            from models import WebhookEventModel
            telefone = context_variables.get("telefone")
            if telefone:
                clean_tel = re.sub(r"\D", "", telefone)
                tel_suffix = clean_tel[-8:] if len(clean_tel) >= 8 else clean_tel
                from sqlalchemy import or_
                past_events = await db.execute(
                    select(WebhookEventModel)
                    .where(
                        or_(
                            WebhookEventModel.telefone == telefone,
                            WebhookEventModel.telefone.like(f"%{tel_suffix}")
                        )
                    )
                    .order_by(WebhookEventModel.created_at.desc())
                    .limit(50)
                )
                events = past_events.scalars().all()
                for ev in events:
                    match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", ev.mensagem or "")
                    if match:
                        user_email_to_add = match.group(0)
                        break
            
            if user_email_to_add and user_email_to_add not in convidados_list:
                convidados_list.append(user_email_to_add)
            
            color_to_use = None
            if db_token and db_token.default_event_color:
                color_to_use = db_token.default_event_color
            if not color_to_use:
                color_to_use = tool_args.get("cor")

            # Limpeza do título do evento conforme regras
            titulo = tool_args.get("titulo") or ""
            titulo = re.sub(r"\s*-\s*Online\s*\(a confirmar\)", "", titulo, flags=re.IGNORECASE)
            titulo = re.sub(r"\s*\|\s*Online\s*\(a confirmar\)", "", titulo, flags=re.IGNORECASE)
            titulo = re.sub(r"\s*\(a confirmar\)", "", titulo, flags=re.IGNORECASE)
            titulo = re.sub(r"\s*\|\s*a confirmar", "", titulo, flags=re.IGNORECASE)
            titulo = re.sub(r"\s*-\s*a confirmar", "", titulo, flags=re.IGNORECASE)
            titulo = re.sub(r"\s*Online\s*", "", titulo, flags=re.IGNORECASE)
            titulo = titulo.strip(" -|")

            # Verificar se o horário já está ocupado por outro compromisso (prevenir Double Booking / Concorrência)
            start_str = tool_args.get("inicio")
            end_str = tool_args.get("fim")
            if start_str and end_str:
                existing_events = await service.list_events(
                    max_results=1,
                    time_min=start_str,
                    time_max=end_str
                )
                if existing_events:
                    return f"❌ Erro de Concorrência: O horário selecionado não está mais disponível no calendário, pois acabou de ser reservado. Por favor, liste as vagas livres de mentoria novamente para obter opções atualizadas."

            res = await service.create_event(
                summary=titulo,
                start_time=tool_args.get("inicio"),
                end_time=tool_args.get("fim"),
                description=tool_args.get("descricao"),
                location=tool_args.get("local"),
                attendees=convidados_list,
                color=color_to_use,
                recurrence=tool_args.get("recorrencia")
            )
            meet_link = res.get('hangoutLink')
            is_jitsi = False
            if not meet_link:
                meet_link = f"https://meet.jit.si/mentoria-{res.get('id')}"
                is_jitsi = True
                try:
                    await service.update_event(
                        event_id=res.get('id'),
                        location=f"Videoconferência (Jitsi Meet): {meet_link}",
                        description=f"{tool_args.get('descricao') or ''}\n\nLink da Reunião (Jitsi): {meet_link}"
                    )
                except Exception as up_err:
                    logger.warning(f"Não foi possível atualizar o evento com o link do Jitsi: {up_err}")
            
            meet_label = "Jitsi Meet" if is_jitsi else "Google Meet"
            meet_str = f" | Link da Reunião ({meet_label}): {meet_link}" if meet_link else ""
            
            # Buscar as configurações de webhook (zapvoice_url, zapvoice_api_token)
            from models import WebhookConfigModel
            result_cfg = await db.execute(select(WebhookConfigModel))
            config_obj = result_cfg.scalars().first()
            
            sync_msg = ""
            # Sincronizar os dados do agendamento com o endpoint público do ZapVoice
            if res and config_obj and config_obj.zapvoice_url and config_obj.zapvoice_api_token:
                phone = (context_variables.get("telefone") or context_variables.get("contact_phone")) if context_variables else None
                if phone:
                    from zapvoice_utils import update_zapvoice_lead_public
                    
                    calendar_link = meet_link or res.get('htmlLink')
                    event_data = {
                        "name": context_variables.get("contact_name"),
                        "email": convidados_list[0] if convidados_list else None,
                        "google_calendar_link": calendar_link,
                        "event_datetime": tool_args.get("inicio"),
                        "product_name": res.get("summary"),
                        "variables": {
                            "status": "agendado",
                            "google_calendar_link": calendar_link,
                            "event_datetime": tool_args.get("inicio")
                        }
                    }
                    event_data = {k: v for k, v in event_data.items() if v is not None}
                    
                    try:
                        success = await update_zapvoice_lead_public(
                            zapvoice_url=config_obj.zapvoice_url,
                            phone=phone,
                            token=config_obj.zapvoice_api_token,
                            data=event_data
                        )
                        if success:
                            sync_msg = f"\n📲 ZapVoice integrado com sucesso! Contato: {phone} atualizado com Link: {calendar_link} e Horário: {tool_args.get('inicio')}."
                        else:
                            sync_msg = f"\n⚠️ ZapVoice: Falha ao integrar o agendamento no endpoint do lead."
                    except Exception as zv_err:
                        sync_msg = f"\n⚠️ ZapVoice: Erro na chamada da API: {zv_err}"
            
            # Persistir o agendamento localmente no banco de dados
            if res and res.get('id'):
                try:
                    from models import CalendarEventModel
                    new_local_event = CalendarEventModel(
                        event_id=res.get('id'),
                        telefone=context_variables.get("contact_phone") if context_variables else None,
                        email=convidados_list[0] if convidados_list else None,
                        titulo=res.get("summary"),
                        data_horario=tool_args.get("inicio")
                    )
                    db.add(new_local_event)
                    await db.commit()
                    logger.info(f"💾 Evento {res.get('id')} persistido localmente no banco de dados.")
                except Exception as db_err:
                    logger.error(f"❌ Erro ao salvar evento localmente no banco: {db_err}")
            
            return f"✅ Evento criado com sucesso! ID do evento: {res.get('id')} | Link: {res.get('htmlLink')}{meet_str}{sync_msg}"
            
        elif acao == "listar":
            # Para listar, nós calculamos os horários de slots vagos (livres) do profissional.
            # O Google Calendar retorna os eventos agendados (ocupados).
            # Nós deduzimos as vagas disponíveis a partir dos intervalos que não possuem eventos.
            import datetime
            from datetime import timezone, timedelta
            
            tz_sp = timezone(timedelta(hours=-3)) # Horário de Brasília
            agora_sp = datetime.datetime.now(tz_sp)
            
            # Obter limites de tempo do parâmetro ou adotar padrão (próximos 7 dias)
            inicio_str = tool_args.get("inicio")
            fim_str = tool_args.get("fim")
            
            # Determinar a duração do slot (em minutos). Padrão 60 minutos
            duracao_minutos = tool_args.get("duracao_minutos") or tool_args.get("duration_minutes") or 60
            duracao = timedelta(minutes=int(duracao_minutos))
            
            if inicio_str:
                try:
                    dt_inicio = datetime.datetime.fromisoformat(inicio_str.replace("Z", "+00:00")).astimezone(tz_sp)
                except Exception:
                    dt_inicio = agora_sp
            else:
                dt_inicio = agora_sp
                
            if fim_str:
                try:
                    dt_fim = datetime.datetime.fromisoformat(fim_str.replace("Z", "+00:00")).astimezone(tz_sp)
                except Exception:
                    dt_fim = dt_inicio + timedelta(days=7)
            else:
                dt_fim = dt_inicio + timedelta(days=7)
                
            # Ajustar dt_fim para o final do dia correspondente para capturar bloqueios da noite
            dt_fim = datetime.datetime.combine(dt_fim.date(), datetime.time(23, 59, 59)).replace(tzinfo=tz_sp)
                
            # Buscar todos os eventos cadastrados (bloqueios) no intervalo
            events = await service.list_events(
                max_results=150,
                time_min=dt_inicio.isoformat(),
                time_max=dt_fim.isoformat()
            )
            
            # Mapear os intervalos ocupados
            ocupados = []
            for e in events:
                e_start_raw = e['start'].get('dateTime', e['start'].get('date'))
                e_end_raw = e['end'].get('dateTime', e['end'].get('date'))
                if not e_start_raw or not e_end_raw:
                    continue
                try:
                    if len(e_start_raw) == 10:
                        e_start = datetime.datetime.combine(datetime.date.fromisoformat(e_start_raw), datetime.time(0, 0)).replace(tzinfo=tz_sp)
                        e_end = datetime.datetime.combine(datetime.date.fromisoformat(e_end_raw), datetime.time(23, 59, 59)).replace(tzinfo=tz_sp)
                    else:
                        e_start = datetime.datetime.fromisoformat(e_start_raw.replace("Z", "+00:00")).astimezone(tz_sp)
                        e_end = datetime.datetime.fromisoformat(e_end_raw.replace("Z", "+00:00")).astimezone(tz_sp)
                    ocupados.append((e_start, e_end))
                except Exception:
                    continue
            
            # Gerar slots de duracao_minutos disponíveis em TODOS OS DIAS da semana
            # Faixa padrão: das 08:00 às 23:59
            vagas = {}
            dias_semana_nomes = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
            
            dia_atual = dt_inicio.date()
            fim_date = dt_fim.date()
            
            while dia_atual <= fim_date:
                # 1. Definir o intervalo de trabalho do dia: das 08:00 às 23:59
                dia_start = datetime.datetime.combine(dia_atual, datetime.time(8, 0)).replace(tzinfo=tz_sp)
                dia_end = datetime.datetime.combine(dia_atual, datetime.time(23, 59)).replace(tzinfo=tz_sp)
                
                # Se for hoje, ajustar o dia_start para agora_sp se agora_sp for maior que 08:00
                if dia_atual == agora_sp.date() and agora_sp > dia_start:
                    # Arredondar agora_sp para os próximos 30 minutos
                    minutes = agora_sp.minute
                    if minutes == 0:
                        dia_start = agora_sp.replace(second=0, microsecond=0)
                    elif minutes <= 30:
                        dia_start = agora_sp.replace(minute=30, second=0, microsecond=0)
                    else:
                        dia_start = (agora_sp + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
                
                # Lista de intervalos livres no dia. Começa com o dia inteiro livre
                intervalos_livres = [(dia_start, dia_end)]
                
                # Filtrar eventos ocupados que pertencem a este dia e subtrair
                eventos_dia = []
                for o_start, o_end in ocupados:
                    if o_start < dia_end and o_end > dia_start:
                        eventos_dia.append((max(o_start, dia_start), min(o_end, dia_end)))
                
                for o_start, o_end in eventos_dia:
                    novos_livres = []
                    for f_start, f_end in intervalos_livres:
                        if o_start >= f_end or o_end <= f_start:
                            novos_livres.append((f_start, f_end))
                        else:
                            if o_start > f_start:
                                novos_livres.append((f_start, o_start))
                            if o_end < f_end:
                                novos_livres.append((o_end, f_end))
                    intervalos_livres = novos_livres
                
                # Filtrar intervalos que comportam a duração mínima
                intervalos_validos = []
                for f_start, f_end in intervalos_livres:
                    if (f_end - f_start) >= duracao:
                        intervalos_validos.append((f_start, f_end))
                        
                if intervalos_validos:
                    dia_str = f"{dias_semana_nomes[dia_atual.weekday()]} ({dia_atual.strftime('%d/%m')})"
                    vagas[dia_str] = []
                    for f_start, f_end in intervalos_validos:
                        vagas[dia_str].append(f"{f_start.strftime('%H:%M')}-{f_end.strftime('%H:%M')}")
                        
                dia_atual += timedelta(days=1)
                
            if not vagas:
                return "📅 Não encontrei nenhuma vaga/horário livre disponível para agendamento no período selecionado."
                
            resp = f"Dias e horários disponíveis (Horário de Brasília) para a mentoria de {int(duracao_minutos)} min:\n\n"
            for dia, slots in vagas.items():
                resp += f"{dia}: " + ", ".join(slots) + "\n"
            
            resp += "\n⚠️ IMPORTANTE: Os horários acima são livres no calendário do profissional. Se houver horários listados para HOJE, você pode e DEVE oferecê-los ao cliente como opções viáveis."
            return resp

        elif acao == "listar_ativos" or acao == "listar_compromissos":
            # Retorna os eventos agendados ativos no calendário
            import datetime
            from datetime import timezone, timedelta
            
            tz_sp = timezone(timedelta(hours=-3))
            agora_sp = datetime.datetime.now(tz_sp)
            
            inicio_str = tool_args.get("inicio")
            fim_str = tool_args.get("fim")
            
            if inicio_str:
                try:
                    dt_inicio = datetime.datetime.fromisoformat(inicio_str.replace("Z", "+00:00")).astimezone(tz_sp)
                except Exception:
                    dt_inicio = agora_sp
            else:
                dt_inicio = agora_sp
                
            if fim_str:
                try:
                    dt_fim = datetime.datetime.fromisoformat(fim_str.replace("Z", "+00:00")).astimezone(tz_sp)
                except Exception:
                    dt_fim = dt_inicio + timedelta(days=30)
            else:
                dt_fim = dt_inicio + timedelta(days=30)
                
            search_query = tool_args.get("busca")
            contact_name = context_variables.get("contact_name") if context_variables else None
            
            # Se não há query de busca e temos o nome do contato, filtramos pelo nome do contato no Google
            if not search_query and contact_name:
                search_query = contact_name
                
            events = await service.list_events(
                max_results=100,
                time_min=dt_inicio.isoformat(),
                time_max=dt_fim.isoformat(),
                q=search_query
            )
            
            # Filtrar na lista também pelo nome/query para evitar que o Google traga resultados parciais/fuzzy indesejados
            filtered_events = []
            for e in events:
                summary = e.get('summary', '').lower()
                attendees = e.get('attendees', [])
                attendee_emails = [a.get('email', '').lower() for a in attendees if a.get('email')]
                
                match = True
                if search_query:
                    sq_lower = search_query.lower()
                    match_id = sq_lower == e.get('id', '').lower()
                    match_summary = sq_lower in summary
                    match_attendee = any(sq_lower in email for email in attendee_emails)
                    if not match_id and not match_summary and not match_attendee:
                        match = False
                        
                if match:
                    filtered_events.append(e)
            
            events = filtered_events
            
            if not events:
                return f"📅 Nenhum compromisso ou agendamento ativo encontrado para o período selecionado (de {dt_inicio.strftime('%d/%m/%Y %H:%M')} a {dt_fim.strftime('%d/%m/%Y %H:%M')}) associado a '{search_query or 'este contato'}'."
                
            resp = f"📅 Agendamentos ATIVOS e marcados no calendário para o período de {dt_inicio.strftime('%d/%m/%Y')} a {dt_fim.strftime('%d/%m/%Y')}:\n\n"
            for e in events:
                e_start_raw = e['start'].get('dateTime', e['start'].get('date'))
                e_end_raw = e['end'].get('dateTime', e['end'].get('date'))
                if not e_start_raw or not e_end_raw:
                    continue
                try:
                    if len(e_start_raw) == 10:
                        start_fmt = datetime.date.fromisoformat(e_start_raw).strftime('%d/%m/%Y')
                        time_str = "Dia inteiro"
                    else:
                        dt_s = datetime.datetime.fromisoformat(e_start_raw.replace("Z", "+00:00")).astimezone(tz_sp)
                        dt_e = datetime.datetime.fromisoformat(e_end_raw.replace("Z", "+00:00")).astimezone(tz_sp)
                        start_fmt = dt_s.strftime('%d/%m/%Y')
                        time_str = f"das {dt_s.strftime('%H:%M')} às {dt_e.strftime('%H:%M')}"
                        
                    resp += f"• *{e.get('summary', 'Sem Título')}*\n"
                    resp += f"  🗓️ Data: {start_fmt} | ⏰ Horário: {time_str}\n"
                    resp += f"  ID do evento: `{e.get('id')}`\n"
                    if e.get('hangoutLink'):
                        resp += f"  🔗 Google Meet: {e.get('hangoutLink')}\n"
                    resp += "\n"
                except Exception:
                    continue
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
            
            # Atualizar localmente no banco
            if res and res.get('id'):
                try:
                    from models import CalendarEventModel
                    from sqlalchemy import select
                    result_evt = await db.execute(select(CalendarEventModel).where(CalendarEventModel.event_id == event_id))
                    local_evt = result_evt.scalars().first()
                    if local_evt:
                        if tool_args.get("titulo"):
                            local_evt.titulo = tool_args.get("titulo")
                        if tool_args.get("inicio"):
                            local_evt.data_horario = tool_args.get("inicio")
                        if tool_args.get("convidados"):
                            convs_list = tool_args.get("convidados")
                            local_evt.email = convs_list[0] if isinstance(convs_list, list) and convs_list else str(convs_list)
                        await db.commit()
                        logger.info(f"💾 Evento {event_id} atualizado no banco local.")
                except Exception as db_err:
                    logger.error(f"❌ Erro ao atualizar evento localmente: {db_err}")
            
            # Buscar as configurações de webhook (zapvoice_url, zapvoice_api_token)
            from models import WebhookConfigModel
            result_cfg = await db.execute(select(WebhookConfigModel))
            config_obj = result_cfg.scalars().first()
            
            sync_msg = ""
            if res and config_obj and config_obj.zapvoice_url and config_obj.zapvoice_api_token:
                phone = (context_variables.get("telefone") or context_variables.get("contact_phone")) if context_variables else None
                if phone:
                    from zapvoice_utils import update_zapvoice_lead_public
                    
                    calendar_link = res.get('hangoutLink') or f"https://meet.jit.si/mentoria-{res.get('id')}"
                    email_to_use = None
                    if tool_args.get("convidados"):
                        convs = tool_args.get("convidados")
                        email_to_use = convs[0] if isinstance(convs, list) and convs else str(convs)
                    else:
                        email_to_use = local_evt.email if 'local_evt' in locals() and local_evt else None
                        
                    event_data = {
                        "name": context_variables.get("contact_name"),
                        "email": email_to_use,
                        "google_calendar_link": calendar_link,
                        "event_datetime": tool_args.get("inicio") or (local_evt.data_horario if 'local_evt' in locals() and local_evt else None),
                        "product_name": res.get("summary"),
                        "variables": {
                            "status": "agendado",
                            "google_calendar_link": calendar_link,
                            "event_datetime": tool_args.get("inicio") or (local_evt.data_horario if 'local_evt' in locals() and local_evt else None)
                        }
                    }
                    event_data = {k: v for k, v in event_data.items() if v is not None}
                    
                    try:
                        success = await update_zapvoice_lead_public(
                            zapvoice_url=config_obj.zapvoice_url,
                            phone=phone,
                            token=config_obj.zapvoice_api_token,
                            data=event_data
                        )
                        if success:
                            sync_msg = f" | 📲 ZapVoice atualizado com sucesso! Contato: {phone} atualizado com Link: {calendar_link} e Novo Horário: {tool_args.get('inicio')}."
                        else:
                            sync_msg = f" | ⚠️ ZapVoice: Falha ao integrar o reagendamento no endpoint do lead."
                    except Exception as zv_err:
                        sync_msg = f" | ⚠️ ZapVoice: Erro na chamada da API: {zv_err}"
            
            return f"✅ Evento '{res.get('summary')}' atualizado com sucesso! ID: {res.get('id')} | Link: {res.get('htmlLink')}{sync_msg}"
            
        elif acao == "cancelar" or acao == "deletar":
            event_id = tool_args.get("event_id")
            if not event_id:
                return "❌ Erro: O ID do evento (event_id) é obrigatório para cancelar."
                
            await service.delete_event(event_id)
            
            # Remover localmente do banco
            try:
                from models import CalendarEventModel
                from sqlalchemy import select
                result_evt = await db.execute(select(CalendarEventModel).where(CalendarEventModel.event_id == event_id))
                local_evt = result_evt.scalars().first()
                if local_evt:
                    await db.delete(local_evt)
                    await db.commit()
                    logger.info(f"💾 Evento {event_id} removido do banco local.")
            except Exception as db_err:
                logger.error(f"❌ Erro ao remover evento localmente: {db_err}")
                
            # Sincronizar o cancelamento com o endpoint público do ZapVoice
            from models import WebhookConfigModel
            result_cfg = await db.execute(select(WebhookConfigModel))
            config_obj = result_cfg.scalars().first()
            
            sync_msg = ""
            if config_obj and config_obj.zapvoice_url and config_obj.zapvoice_api_token:
                phone = (context_variables.get("telefone") or context_variables.get("contact_phone")) if context_variables else None
                if phone:
                    from zapvoice_utils import update_zapvoice_lead_public
                    
                    event_data = {
                        "name": context_variables.get("contact_name"),
                        "google_calendar_link": None,
                        "event_datetime": None,
                        "variables": {
                            "status": "cancelado",
                            "google_calendar_link": None,
                            "event_datetime": None
                        }
                    }
                    
                    try:
                        success = await update_zapvoice_lead_public(
                            zapvoice_url=config_obj.zapvoice_url,
                            phone=phone,
                            token=config_obj.zapvoice_api_token,
                            data=event_data
                        )
                        if success:
                            sync_msg = f" | 📲 ZapVoice atualizado: Dados de agendamento limpos para o contato {phone}."
                        else:
                            sync_msg = f" | ⚠️ ZapVoice: Falha ao limpar os dados do lead após o cancelamento."
                    except Exception as zv_err:
                        sync_msg = f" | ⚠️ ZapVoice: Erro na chamada da API: {zv_err}"
                        
            return f"✅ Evento removido com sucesso do calendário.{sync_msg}"
            
        return f"❌ Erro: Ação '{acao}' não reconhecida. Use: criar, listar, atualizar ou cancelar."
        
    except Exception as e:
        logger.error(f"Erro no Google Calendar Handler: {e}")
        err_msg = str(e)
        if "404" in err_msg or "notFound" in err_msg:
            return "❌ Erro: O evento com o ID especificado não foi encontrado no calendário. Ele pode ter sido deletado ou pertence a outra agenda conectada."
        return f"❌ Houve um erro ao acessar o Google Calendar: {err_msg}"
