import os

file_path = 'webhook_tasks.py'
with open(file_path, 'rb') as f:
    content = f.read()

# Define markers to find the broken block
start_marker = b'logger.info(f"'
end_marker = b'agent_config = _build_agent_config(db_agent)'

start_pos = content.find(start_marker, content.find(b'# H. O registro do Lead propriamente dito'))
end_pos = content.find(end_marker)

if start_pos != -1 and end_pos != -1:
    # We found the block. Now we construct the replacement.
    # Note: We need to be careful with indentation.
    replacement = b"""logger.info(f"\xf0\x9f\x97\x91\xef\xb8\x8f Dele\xc3\xa7\xc3\xa3o em cascata conclu\xc3\xadda para {target_tel}")
                    
                    # Finalizamos o processo
                    return
            except Exception as e:
                logger.error(f"Erro no processamento de auto-dele\xc3\xa7\xc3\xa3o: {e}")
                _add_step(db, event_id, "\xe2\x9a\xa0\xef\xb8\x8f Erro na Auto-Dele\xc3\xa7\xc3\xa3o", str(e))

        # --- TRAP DE AUTOMA\xc3\x87\xc3\x83O E SEGURAN\xc3\x87A ---
        lead_internal_id = None
        if config.leads_table:
            try:
                from sqlalchemy import text
                _add_step(db, event_id, "\xf0\x9f\x94\x8d Verificando status do contato", "Validando etiquetas do Chatwoot e janela de 24h...")
                
                # Buscamos apenas ID e timestamps, ignorando 'pode_enviar_mensagem' conforme solicitado pelo usu\xc3\xa1rio
                query = text(f"SELECT id, ultima_mensagem_em, created_at FROM {config.leads_table} WHERE telefone = :tel LIMIT 1")
                res = db.execute(query, {"tel": event.telefone}).fetchone()
                
                lead_created_at = None
                last_msg = None
                if res:
                    lead_internal_id, last_msg, lead_created_at = res
                    
                # --- Sincroniza\xc3\xa7\xc3\xa3o Din\xc3\xa2mica com Chatwoot (Etiqueta de Pausa) ---
                # Agora SEMPRE verificamos as etiquetas para decidir se a automa\xc3\xa7\xc3\xa3o deve rodar
                is_paused = False
                ignore_label = (config.ignore_by_label or "humano").strip().lower()
                
                try:
                    cw_url = (config.chatwoot_url or "").rstrip("/")
                    cw_token = config.chatwoot_api_token
                    if cw_url and cw_token and event.conversa_id and event.conta_id:
                        labels_url = f"{cw_url}/api/v1/accounts/{event.conta_id}/conversations/{event.conversa_id}/labels"
                        headers = {"api_access_token": cw_token}
                        
                        with httpx.Client(timeout=5.0) as client:
                            resp = client.get(labels_url, headers=headers)
                            if resp.status_code == 200:
                                current_labels = resp.json().get("payload", [])
                                _add_step(db, event_id, "\xf0\x9f\x94\x8d Verifica\xc3\xa7\xc3\xa3o de Etiquetas", f"Etiquetas no Chatwoot: {', '.join(current_labels) if current_labels else 'Nenhuma'}")
                                
                                # Busca pela etiqueta de pausa configurada (ex: 'humano')
                                has_ignore_label = any(l.lower() == ignore_label for l in current_labels)
                                
                                if has_ignore_label:
                                    is_paused = True
                                    _add_step(db, event_id, "\xf0\x9f\x9a\x91 Automa\xc3\xa7\xc3\xa3o Pausada", f"A etiqueta '{ignore_label}' foi detectada no Chatwoot. Interrompendo processamento.")
                                else:
                                    _add_step(db, event_id, "\xe2\x9c\x85 Contato autorizado", f"Etiqueta '{ignore_label}' n\xc3\xa3o encontrada. Seguindo com a automa\xc3\xa7\xc3\xa3o.")
                            else:
                                logger.warning(f"Erro ao buscar etiquetas: {resp.status_code}")
                                _add_step(db, event_id, "\xe2\x9a\xa0\xef\xb8\x8f Aviso: Falha no Chatwoot", "N\xc3\xa3o foi poss\xc3\xadvel validar as etiquetas. Por seguran\xc3\xa7a, assumindo ativa\xc3\xa7\xc3\xa3o se houver lead.")
                except Exception as e_sync:
                    logger.error(f"Erro na sincroniza\xc3\xa7\xc3\xa3o de status: {e_sync}")
                    _add_step(db, event_id, "\xe2\x9a\xa0\xef\xb8\x8f Erro T\xc3\xa9cnico", f"Falha ao validar etiquetas: {str(e_sync)}")

                if is_paused:
                    event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                    event.status = "completed"
                    db.commit()
                    return
                
                # --- Verifica\xc3\xa7\xc3\xa3o da Janela de 24h ---
                if last_msg:
                    if last_msg.tzinfo:
                        now = datetime.now(last_msg.tzinfo)
                    else:
                        now = datetime.utcnow()
                    
                    diff_seconds = (now - last_msg).total_seconds()
                    if diff_seconds > 86400: # 24 horas
                        _add_step(db, event_id, "\xf0\x9f\x94\x92 Janela Fechada", f"A janela de 24h expirou. Resposta cancelada por seguran\xc3\xa7a.")
                        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                        event.status = "completed"
                        db.commit()
                        return
            except Exception as e:
                logger.error(f"Erro ao verificar trap de automa\xc3\xa7\xc3\xa3o: {e}")
                _add_step(db, event_id, "\xf0\x9f\x94\x8d Aviso: Trap Ignorado", f"Erro ao verificar lead: {str(e)}")

        """
    new_content = content[:start_pos] + replacement + content[end_pos:]
    with open(file_path, 'wb') as f:
        f.write(new_content)
    print("File repaired successfully")
else:
    print(f"Markers not found: start={start_pos}, end={end_pos}")
