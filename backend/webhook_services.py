import os
import json
import logging
import asyncio
import httpx
import time
import re
from datetime import datetime, timezone
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel, KnowledgeItemModel, KnowledgeBaseModel, InteractionLog
from config_store import AgentConfig
from core.timezone import get_now_br, get_now_utc

logger = logging.getLogger(__name__)

def execute_keyword_deletion_trap(db, event, config, target_tel, target_cid, target_aid):
    """Encapsula todo o fluxo síncrono cross-platform de auto-deleção e limpeza."""
    import webhook_tasks
    webhook_tasks._add_step(db, event.id, "🗑️ Auto-Deleção Detectada", f"Palavra-chave encontrada no reset")
    
    # 1. Enviar mensagem de despedida PRIMEIRO
    farewell_msg = config.delete_message or "Seus dados foram removidos do nosso sistema. Até logo!"
    if target_cid and target_aid:
        webhook_tasks._send_chatwoot_message(db, event.id, target_cid, target_aid, farewell_msg, config)
        webhook_tasks._add_step(db, event.id, "📤 Mensagem de despedida enviada", "Fluxo finalizado via palavra-chave.")
        
        # --- SUBSTITUIÇÃO DE ETIQUETAS NO CHATWOOT NO RESET ---
        try:
            cw_url = (config.chatwoot_url or os.getenv("CHATWOOT_URL", "")).rstrip("/")
            cw_token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
            if cw_url and cw_token:
                labels_api_url = f"{cw_url}/api/v1/accounts/{target_aid}/conversations/{target_cid}/labels"
                headers = {"api_access_token": cw_token, "Content-Type": "application/json"}
                
                # Carregar etiquetas configuradas para substituição no reset
                reset_labels = []
                if config.delete_labels:
                    try:
                        reset_labels = json.loads(config.delete_labels)
                    except Exception:
                        if isinstance(config.delete_labels, list):
                            reset_labels = config.delete_labels
                
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(labels_api_url, json={"labels": reset_labels}, headers=headers)
                    if resp.status_code in (200, 201):
                        webhook_tasks._add_step(db, event.id, "🏷️ Etiquetas Substituídas no Reset", f"Etiquetas da conversa substituídas por: {reset_labels}")
                    else:
                        logger.warning(f"Erro ao substituir etiquetas no reset: {resp.status_code} - {resp.text}")
        except Exception as e_lbl:
            logger.warning(f"Erro no processamento de substituição de etiquetas: {e_lbl}")

    # 2. Deletar tudo do banco de dados (Cascata inteligente síncrona cross-platform)
    if config.leads_table:
        from sqlalchemy import text
        # A. Coletar IDs de leads e telefones de todas as tabelas cadastradas no sistema usando sufixo de 8 dígitos
        suffix_8 = target_tel[-8:] if len(target_tel) >= 8 else "---"
        
        all_lead_ids = []
        all_tables = [config.leads_table]
        try:
            res_tables = db.execute(text("SELECT DISTINCT leads_table FROM webhook_configs WHERE leads_table IS NOT NULL AND leads_table != ''"))
            all_tables = list(set([r[0] for r in res_tables.fetchall() if r[0]] + [config.leads_table]))
        except Exception as e_tables:
            logger.warning(f"Erro ao obter leads_tables: {e_tables}")

        # B. Deletar leads de todas as tabelas e coletar seus IDs
        for t in all_tables:
            try:
                res_ids = db.execute(
                    text(f"SELECT id FROM {t} WHERE telefone = :tel OR RIGHT(telefone, 8) = :suffix"),
                    {"tel": target_tel, "suffix": suffix_8}
                )
                found_ids = [str(r[0]) for r in res_ids.fetchall() if r[0]]
                all_lead_ids.extend(found_ids)
                
                db.execute(
                    text(f"DELETE FROM {t} WHERE telefone = :tel OR RIGHT(telefone, 8) = :suffix"),
                    {"tel": target_tel, "suffix": suffix_8}
                )
                db.commit()
            except Exception as e_del_tbl:
                db.rollback()
                logger.warning(f"Erro ao processar limpeza da tabela {t}: {e_del_tbl}")

        # C. Histórico de eventos (webhook_events) - Remoção cross-platform com sufixo de 8 dígitos
        try:
            db.execute(
                text("DELETE FROM webhook_events WHERE telefone = :tel OR RIGHT(telefone, 8) = :suffix"),
                {"tel": target_tel, "suffix": suffix_8}
            )
            db.commit()
        except Exception as e_evt:
            db.rollback()
            logger.warning(f"Erro ao deletar eventos: {e_evt}")

        # D. Limpar memórias vetoriais (knowledge_items)
        try:
            db.execute(
                text("DELETE FROM knowledge_items WHERE metadata_val = :tel OR metadata_val = :tel_pref OR metadata_val = :tel_suff OR metadata_val = :tel_pref_suff"),
                {
                    "tel": target_tel,
                    "tel_pref": f"phone:{target_tel}",
                    "tel_suff": suffix_8,
                    "tel_pref_suff": f"phone:{suffix_8}"
                }
            )
            db.commit()
        except Exception as e_ki:
            db.rollback()
            logger.warning(f"Erro ao deletar knowledge_items: {e_ki}")

        # E. Triggers agendados e status de mensagens
        try:
            trig_res = db.execute(
                text("SELECT id FROM scheduled_triggers WHERE contact_phone = :tel OR RIGHT(contact_phone, 8) = :suffix"),
                {"tel": target_tel, "suffix": suffix_8}
            )
            trig_ids = [r[0] for r in trig_res.fetchall()]
            
            if trig_ids:
                db.execute(text("DELETE FROM message_status WHERE trigger_id = ANY(:ids)"), {"ids": trig_ids})
                db.execute(text("DELETE FROM scheduled_triggers WHERE id = ANY(:ids)"), {"ids": trig_ids})
            else:
                db.execute(
                    text("DELETE FROM scheduled_triggers WHERE contact_phone = :tel OR RIGHT(contact_phone, 8) = :suffix"),
                    {"tel": target_tel, "suffix": suffix_8}
                )
            db.commit()
        except Exception as e_trig:
            db.rollback()
            logger.warning(f"Erro ao limpar triggers no reset: {e_trig}")

        # F. Memórias, sumários e logs de interação (usando telefones, telefones com prefixo 'tel_' e IDs coletados)
        try:
            tels_with_prefix_tel = [f"tel_{target_tel}", f"tel_{suffix_8}"]
            all_keys = [target_tel, suffix_8] + tels_with_prefix_tel + all_lead_ids
            all_keys = list(dict.fromkeys([k for k in all_keys if k])) # remover duplicados e nulos
            
            if all_keys:
                db.execute(text("DELETE FROM user_memory WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.execute(text("DELETE FROM session_summaries WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.execute(text("DELETE FROM interaction_logs WHERE session_id = ANY(:keys)"), {"keys": all_keys})
                db.commit()
        except Exception as e_mem:
            db.rollback()
            logger.warning(f"Erro ao limpar memórias, sumários e logs: {e_mem}")

        logger.info(f"🗑️ Deleção cross-platform inteligente síncrona concluída para {target_tel}")
    
    # 3. Limpar cache de debounce no Redis (IMPORTANTE: evita que a próxima mensagem agrupe com esta)
    try:
        import redis as redis_lib
        _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
        _redis_local.delete(f"webhook:debounce:id:{config.id}:{target_tel}")
        _redis_local.delete(f"webhook:debounce:text:{config.id}:{target_tel}")
        # Setar lock temporário de 10 segundos para evitar recriação de lead por webhook de eco (is_out)
        _redis_local.setex(f"webhook:resetting:{config.id}:{target_tel}", 10, "1")
    except Exception as redis_err:
        logger.error(f"Erro ao limpar redis no reset: {redis_err}")


def check_automation_trap(db, event, config, lead_internal_id, last_msg, lead_created_at):
    """Encapsula a checagem de pausa, etiquetas dinâmicas e janela de 24h."""
    import webhook_tasks
    is_paused = False
    ignore_label = (config.ignore_by_label or "humano").strip().lower()
    
    try:
        cw_url = (config.chatwoot_url or "").rstrip("/")
        cw_token = config.chatwoot_api_token
        if cw_url and cw_token and event.conversa_id and event.conta_id:
            is_paused = asyncio.run(webhook_tasks.is_conversation_paused(
                cw_url, 
                int(event.conta_id), 
                int(event.conversa_id), 
                cw_token, 
                ignore_label
            ))
            
            if is_paused:
                webhook_tasks._add_step(db, event.id, "🚑 Automação Pausada", f"A etiqueta '{ignore_label}' foi detectada no Chatwoot. Interrompendo processamento.")
            else:
                webhook_tasks._add_step(db, event.id, "✅ Contato autorizado", f"Etiqueta '{ignore_label}' não encontrada ou inativa. Seguindo com a automação.")
    except Exception as e_sync:
        logger.error(f"Erro na sincronização de status: {e_sync}")
        webhook_tasks._add_step(db, event.id, "⚠️ Erro Técnico", f"Falha ao validar etiquetas: {str(e_sync)}")

    # --- ADIÇÃO DE ETIQUETAS AUTOMÁTICAS (EM CADA MENSAGEM) ---
    if config.labels_on_message:
        try:
            labels_to_add = []
            if isinstance(config.labels_on_message, list):
                labels_to_add = config.labels_on_message
            elif isinstance(config.labels_on_message, str) and config.labels_on_message.strip():
                labels_to_add = json.loads(config.labels_on_message)
            
            if labels_to_add and isinstance(labels_to_add, list):
                cw_url = (config.chatwoot_url or os.getenv("CHATWOOT_URL", "")).rstrip("/")
                cw_token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
                if cw_url and cw_token and event.conversa_id and event.conta_id:
                    webhook_tasks._add_step(db, event.id, "🏷️ Adicionando etiquetas automáticas", f"Etiquetas: {', '.join(labels_to_add)}")
                    success, final_labels = asyncio.run(webhook_tasks.sync_conversation_labels(
                        cw_url, 
                        int(event.conta_id), 
                        int(event.conversa_id), 
                        cw_token, 
                        to_add=labels_to_add
                    ))
                    if success and config.leads_table and event.telefone:
                        from sqlalchemy import text
                        try:
                            # Tentar obter etiquetas atuais locais para mesclagem limpa
                            lead_query = f"SELECT labels FROM {config.leads_table} WHERE telefone = :tel"
                            lead_res = db.execute(text(lead_query), {"tel": event.telefone})
                            lead_row = lead_res.fetchone()
                            existing_labels = []
                            if lead_row and lead_row[0]:
                                try:
                                    parsed = json.loads(lead_row[0])
                                    if isinstance(parsed, list):
                                        existing_labels = [str(x) for x in parsed]
                                    else:
                                        existing_labels = [str(lead_row[0])]
                                except Exception:
                                    existing_labels = [x.strip() for x in lead_row[0].split(",") if x.strip()]
                            
                            # Mesclar as etiquetas do Chatwoot com as locais (por garantia)
                            final_merged = list(final_labels)
                            for item in existing_labels:
                                if item not in final_merged:
                                    final_merged.append(item)
                                    
                            db.execute(text(f"UPDATE {config.leads_table} SET labels = :labels, updated_at = :now WHERE telefone = :tel"), {
                                "labels": json.dumps(final_merged, ensure_ascii=False),
                                "tel": event.telefone,
                                "now": datetime.utcnow()
                            })
                            db.commit()
                            logger.info(f"Etiquetas locais atualizadas via webhook: {final_merged}")
                        except Exception as e_db_update:
                            logger.error(f"Erro ao atualizar etiquetas locais via webhook: {e_db_update}")
        except Exception as e_labels:
            logger.error(f"Erro ao adicionar etiquetas automáticas: {e_labels}")
            webhook_tasks._add_step(db, event.id, "⚠️ Aviso: Etiquetas não adicionadas", f"Falha ao sincronizar etiquetas: {str(e_labels)}")

    if is_paused:
        return True

    # --- Verificação da Janela de 24h ---
    if last_msg:
        # Garantir que ambos sejam aware (UTC) para comparação segura
        msg_dt = last_msg
        if msg_dt.tzinfo is None:
            msg_dt = msg_dt.replace(tzinfo=timezone.utc)
        
        now = get_now_utc()
        diff_seconds = (now - msg_dt).total_seconds()
        if diff_seconds > 86400: # 24 horas
            webhook_tasks._add_step(db, event.id, "🔒 Janela Fechada", f"A janela de 24h expirou. Resposta cancelada por segurança.")
            return True

    return False


def retrieve_context_history(db, event, db_agent, raw_phone, clean_phone, event_id):
    """Encapsula a recuperação do histórico de mensagens anteriores para injeção de contexto."""
    import webhook_tasks
    history = []
    if db_agent.context_window > 0:
        try:
            # Normalização robusta: buscamos pelo telefone com e sem o '+', e também pelos últimos 8 dígitos
            search_phones = [raw_phone, clean_phone, f"+{clean_phone}"]
            search_phones = list(dict.fromkeys([p for p in search_phones if p]))

            # Extraímos os últimos 8 dígitos para busca resiliente ao nono dígito
            tel_suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

            from sqlalchemy import or_
            past_events = db.query(WebhookEventModel).filter(
                WebhookEventModel.webhook_config_id == event.webhook_config_id,
                or_(
                    WebhookEventModel.telefone.in_(search_phones),
                    WebhookEventModel.telefone.like(f"%{tel_suffix}")  # Cobre variações do 9° dígito
                ),
                WebhookEventModel.id != event_id,
                WebhookEventModel.status.in_(["completed", "processed", "delivered", "success"]),
                or_(
                    WebhookEventModel.is_automatic.is_(None),
                    WebhookEventModel.is_automatic == False
                )
            ).order_by(WebhookEventModel.created_at.desc()).limit(db_agent.context_window).all()

            # Reverte para ordem cronológica (mais antiga para mais recente)
            past_events.reverse()

            seen_msgs = set()
            for pe in past_events:
                # 1. Processar 'mensagem'
                if pe.mensagem:
                    role = "assistant" if (pe.dono and pe.dono.lower() in ['agente', 'bot']) else "user"
                    msg_clean = pe.mensagem.strip()
                    if msg_clean not in seen_msgs:
                        history.append({"role": role, "content": pe.mensagem})
                        seen_msgs.add(msg_clean)
                
                # 2. Processar 'agent_response' (se houver e não for duplicata)
                if pe.agent_response:
                    resp_clean = pe.agent_response.strip()
                    if resp_clean not in seen_msgs:
                        history.append({"role": "assistant", "content": pe.agent_response})
                        seen_msgs.add(resp_clean)
            
            # Desduplicação inteligente para evitar mensagens repetidas consecutivas idênticas
            deduped_history = []
            for msg in history:
                if not deduped_history:
                    deduped_history.append(msg)
                else:
                    last_msg = deduped_history[-1]
                    if msg.get("role") == last_msg.get("role") and msg.get("content", "").strip() == last_msg.get("content", "").strip():
                        continue
                    deduped_history.append(msg)
            history = deduped_history

            # Truncamento final de segurança para respeitar a janela
            if len(history) > db_agent.context_window:
                history = history[-db_agent.context_window:]
            
            if history:
                num_pairs = len(past_events)
                webhook_tasks._add_step(db, event_id, "🧠 Memória de Contexto", f"Injetadas {num_pairs} interações ({len(history)} mensagens) como contexto.")
        except Exception as e:
            logger.error(f"Erro ao recuperar histórico para contexto: {e}")
            webhook_tasks._add_step(db, event_id, "⚠️ Erro na Memória", "Não foi possível carregar o histórico anterior.")
            
    return history
