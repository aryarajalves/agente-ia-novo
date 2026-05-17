import os
import json
import logging
import asyncio
import httpx
import time
import re
from datetime import datetime, timezone, timedelta
from celery_app import app
from database import SessionLocal, async_session
from models import WebhookEventModel, WebhookConfigModel, AgentConfigModel, KnowledgeItemModel, KnowledgeBaseModel, InteractionLog
from config_store import AgentConfig
from agent import process_message
from agent_core.logic.pre_router import run_pre_router_ai
from rag_service import get_embedding
from chatwoot_utils import is_conversation_paused, sync_conversation_labels
from core.timezone import get_now_br, get_now_utc
from core.websocket import manager
from agent_core.services.media_service import process_media_content
from celery import shared_task

logger = logging.getLogger(__name__)

def broadcast_status(webhook_id, event_id, status, steps=None):
    """Envia atualização de status e passos via WebSocket de forma segura para workers."""
    try:
        from core.websocket import manager
        payload = {
            "type": "status_update",
            "webhook_id": webhook_id,
            "event_id": event_id,
            "status": status,
            "steps": steps
        }
        
        # Gerenciamento robusto de loop para ambiente multithreaded (Celery)
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(manager.broadcast(payload))
            loop.close()
        except Exception as e:
            logger.error(f"Erro ao disparar broadcast: {e}")
            
    except Exception as ws_err:
        logger.error(f"Erro fatal no broadcast_status: {ws_err}")

def _add_step(db, event_id: int, step: str, detail: str = "", metadata: dict = None):
    event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
    if not event:
        return
    steps = json.loads(event.processing_steps or "[]")
    step_entry = {
        "step": step,
        "detail": detail,
        "timestamp": get_now_br().isoformat(),
    }
    if metadata:
        step_entry["metadata"] = metadata
        
    steps.append(step_entry)
    event.processing_steps = json.dumps(steps, ensure_ascii=False)
    db.commit()
    
    # Log para o console/Docker
    logger.info(f"📍 [Pipeline Event {event_id}] {step}: {detail[:100]}...")
    
    # Notificar via WebSocket
    broadcast_status(event.webhook_config_id, event.id, event.status, steps)


_typing_indicator_supported = True  # cached: set to False on first 404

def _get_cost(model, usage):
    if not usage: return 0
    if not model or not isinstance(model, str):
        model = "gpt-4o-mini"
    # Preços por 1k tokens (USD) - Baseados em GPT-4o e GPT-4o-mini
    rates = {
        "gpt-4o-mini": {"in": 0.00015 / 1000, "out": 0.00060 / 1000},
        "gpt-4o": {"in": 0.005 / 1000, "out": 0.015 / 1000},
        "gpt-3.5-turbo": {"in": 0.0005 / 1000, "out": 0.0015 / 1000},
        "o1": {"in": 0.015 / 1000, "out": 0.060 / 1000},
    }
    
    m = model.lower()
    # Lógica de seleção inteligente
    if "mini" in m:
        rate = rates["gpt-4o-mini"]
    elif "gpt-3.5" in m:
        rate = rates["gpt-3.5-turbo"]
    elif "o1" in m:
        rate = rates["o1"]
    elif "gpt" in m or "4o" in m:
        # Fallback para gpt-4o para modelos premium (incluindo gpt-5.2 etc)
        rate = rates["gpt-4o"]
    else:
        # Fallback final
        rate = rates["gpt-4o-mini"]

    p_tokens = usage.get("prompt_tokens", 0) or usage.get("mini_prompt", 0) + usage.get("main_prompt", 0)
    c_tokens = usage.get("completion_tokens", 0) or usage.get("mini_completion", 0) + usage.get("main_completion", 0)
    
    usd_cost = (p_tokens * rate["in"]) + (c_tokens * rate["out"])
    
    # Conversão para BRL
    try:
        conversion_rate = float(os.getenv("USD_TO_BRL_RATE", "6.0"))
    except:
        conversion_rate = 6.0
        
    return usd_cost * conversion_rate


def _toggle_typing_indicator(config, account_id, conversation_id, command="on"):
    """Liga ou desliga o status 'digitando' no Chatwoot."""
    global _typing_indicator_supported
    if not _typing_indicator_supported:
        return
    try:
        url = (config.chatwoot_url or os.getenv("CHATWOOT_URL", "")).rstrip("/")
        token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
        if not url or not token:
            return
        
        full_url = f"{url}/api/v1/accounts/{account_id}/conversations/{conversation_id}/typing_indicators"
        headers = {"api_access_token": token, "Content-Type": "application/json"}
        with httpx.Client(timeout=3.0) as client:
            resp = client.post(full_url, json={"command": command}, headers=headers)
            if resp.status_code == 404:
                _typing_indicator_supported = False  # disable for rest of process lifetime
    except Exception:
        pass


def _send_chatwoot_message(db, event_id, conversation_id, account_id, content, config, split_paragraphs=False, delay=0):
    """
    Envia a resposta do agente para o Chatwoot.
    Se split_paragraphs=True, divide a mensagem e envia cada parte com o delay configurado.
    """
    try:
        url = (config.chatwoot_url or os.getenv("CHATWOOT_URL", "")).rstrip("/")
        token = config.chatwoot_api_token or os.getenv("CHATWOOT_API_TOKEN", "")
        
        if not url or not token:
            _add_step(db, event_id, "❌ Erro: Chatwoot não configurado", "URL ou Token ausentes no .env/config.")
            return False

        if not conversation_id or not account_id:
            _add_step(db, event_id, "❌ Erro: Dados faltantes", f"conversa_id={conversation_id}, account_id={account_id}")
            return False

        # Preparar partes da mensagem
        if split_paragraphs:
            # Divide por parágrafos (duas ou mais quebras de linha)
            parts = [p.strip() for p in re.split(r'\n\n+', content) if p.strip()]
            if not parts: parts = [content]
        else:
            parts = [content]

        total_parts = len(parts)
        if total_parts > 1:
            _add_step(db, event_id, "✂️ Resposta Fragmentada", f"A mensagem será enviada em {total_parts} partes com delay de {delay}s entre elas.")

        headers = {"api_access_token": token, "Content-Type": "application/json"}
        full_url = f"{url}/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages"

        success = True
        for i, part in enumerate(parts):
            # 1. Ativar 'Digitando'
            _toggle_typing_indicator(config, account_id, conversation_id, "on")
            
            # 2. Pequeno delay de 'simulação' base (mínimo 1s)
            time.sleep(1)
            
            # 3. Enviar a parte da mensagem
            payload = {"content": part, "message_type": "outgoing"}
            
            try:
                with httpx.Client(timeout=20.0) as client:
                    resp = client.post(full_url, json=payload, headers=headers)
                    if resp.status_code not in (200, 201):
                        error_detail = f"Status {resp.status_code}: {resp.text[:200]}\nURL: {full_url}"
                        _add_step(db, event_id, f"❌ Erro no envio (Parte {i+1})", error_detail)
                        success = False
            except Exception as http_err:
                _add_step(db, event_id, f"❌ Falha de Conexão (Parte {i+1})", f"Erro: {str(http_err)}")
                success = False
            
            # 4. Desativar 'Digitando'
            _toggle_typing_indicator(config, account_id, conversation_id, "off")

            # 5. Aplicar delay entre partes (exceto na última)
            if i < total_parts - 1 and delay > 0:
                time.sleep(delay)

        if success:
            if total_parts > 1:
                _add_step(db, event_id, "📤 Partes entregues", f"Todas as {total_parts} partes foram enviadas com sucesso.")
            else:
                _add_step(db, event_id, "📤 Resposta enviada ao Chatwoot", f"Mensagem única entregue com sucesso.")
        
        return success
    except Exception as e:
        _add_step(db, event_id, "❌ Erro crítico no envio", str(e))
        return False


def _build_agent_config(db_agent):
    """Build AgentConfig pydantic object from DB model."""
    import json as _json
    return AgentConfig(
        id=db_agent.id,
        name=db_agent.name,
        description=db_agent.description,
        model=db_agent.model,
        fallback_model=db_agent.fallback_model,
        temperature=db_agent.temperature,
        top_p=db_agent.top_p,
        date_awareness=db_agent.date_awareness,
        system_prompt=db_agent.system_prompt,
        context_window=db_agent.context_window,
        knowledge_base=_json.loads(db_agent.knowledge_base) if db_agent.knowledge_base else [],
        knowledge_base_id=None,
        knowledge_base_ids=[],
        rag_retrieval_count=db_agent.rag_retrieval_count,
        rag_translation_enabled=db_agent.rag_translation_enabled,
        rag_multi_query_enabled=db_agent.rag_multi_query_enabled,
        rag_rerank_enabled=db_agent.rag_rerank_enabled,
        rag_agentic_eval_enabled=db_agent.rag_agentic_eval_enabled,
        rag_parent_expansion_enabled=db_agent.rag_parent_expansion_enabled,
        tool_ids=[],
        is_active=db_agent.is_active,
        simulated_time=db_agent.simulated_time,
        security_competitor_blacklist=db_agent.security_competitor_blacklist,
        security_forbidden_topics=db_agent.security_forbidden_topics,
        security_discount_policy=db_agent.security_discount_policy,
        security_language_complexity=db_agent.security_language_complexity,
        security_pii_filter=db_agent.security_pii_filter,
        security_bot_protection=False,
        security_max_messages_per_session=db_agent.security_max_messages_per_session,
        security_semantic_threshold=db_agent.security_semantic_threshold,
        security_loop_count=db_agent.security_loop_count,
        security_validator_ia=db_agent.security_validator_ia,
        inbox_capture_enabled=db_agent.inbox_capture_enabled,
        ui_primary_color=db_agent.ui_primary_color,
        ui_header_color=db_agent.ui_header_color,
        ui_chat_title=db_agent.ui_chat_title,
        ui_welcome_message=db_agent.ui_welcome_message,
        router_enabled=db_agent.router_enabled,
        router_simple_model=db_agent.router_simple_model,
        router_complex_model=db_agent.router_complex_model,
        handoff_enabled=db_agent.handoff_enabled,
        response_translation_enabled=db_agent.response_translation_enabled,
        response_translation_fallback_lang=db_agent.response_translation_fallback_lang or "portuguese",
        top_k=db_agent.top_k,
        presence_penalty=db_agent.presence_penalty,
        frequency_penalty=db_agent.frequency_penalty,
        safety_settings=db_agent.safety_settings,
        model_settings=_json.loads(db_agent.model_settings) if db_agent.model_settings else {},
    )


@app.task(name="webhook_tasks.process_media_content_task")
def process_media_content_task(webhook_config_id: int, event_id: int):
    """Processa áudio ou imagem imediatamente para extrair texto."""
    db = SessionLocal()
    try:
        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == webhook_config_id).first()
        if not event or not config:
            return

        msg_type = (event.message_type or "text").lower()
        if msg_type not in ["audio", "image"]:
            return

        _add_step(db, event_id, f"🔍 Processamento Imediato ({msg_type})", "Iniciando extração de conteúdo em paralelo...")
        
        openai_key = os.getenv("OPENAI_API_KEY")
        cw_token = config.chatwoot_api_token
        
        # Executar o processamento
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            media_result = loop.run_until_complete(process_media_content(
                url=event.link,
                message_type=msg_type,
                api_key=openai_key,
                chatwoot_token=cw_token
            ))
        finally:
            loop.close()

        if "error" in media_result:
            _add_step(db, event_id, "❌ Erro no processamento imediato", media_result["error"])
            return

        extracted_text = media_result.get("text", "")
        event.mensagem = extracted_text
        # Marcamos como media_ready para que a automação principal saiba que terminou
        event.status = "media_ready" 
        db.commit()
        
        _add_step(db, event_id, "✅ Conteúdo Extraído", extracted_text[:200] + "...")
        
    except Exception as e:
        logger.error(f"Erro na task de mídia imediata: {e}")
    finally:
        db.close()

@app.task(bind=True, name="webhook_tasks.process_webhook_automation")
def process_webhook_automation(self, event_id: int):
    db = SessionLocal()
    try:
        # --- AUTO-MIGRAÇÃO: garante colunas necessárias ---
        try:
            db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS response_delay_seconds INTEGER DEFAULT 0"))
            db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS process_audio BOOLEAN DEFAULT TRUE"))
            db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS process_image BOOLEAN DEFAULT TRUE"))
            db.execute(text("ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS delete_labels TEXT"))
            db.commit()
        except Exception:
            db.rollback()

        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        if not event:
            return

        if event.status in ("cancelled", "grouped"):
            logger.info(f"⏭️ Ignorando evento {event_id} (Status: {event.status})")
            return

        event.status = "processing"
        db.commit()
        
        # Broadcast de início de processamento
        _add_step(db, event_id, "🚀 Iniciando Pipeline", "A tarefa de automação foi iniciada pelo worker.")

        config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == event.webhook_config_id).first()
        if not config:
            return

        if not config.agent_id:
            _add_step(db, event_id, "⚠️ Sem agente configurado", "Configure um agente nas configurações do webhook para continuar.")
            event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            event.status = "completed"
            db.commit()
            return

        # --- RESOLUÇÃO DE MÍDIAS AGRUPADAS ---
        # Se a mensagem contém placeholders de mídia, tentamos buscar as transcrições reais
        if "[AUDIO PENDENTE]" in (event.mensagem or "") or "[IMAGE PENDENTE]" in (event.mensagem or ""):
            _add_step(db, event_id, "⏳ Aguardando mídias", "Algumas mídias deste grupo ainda estão sendo processadas. Aguardando conclusão...")
            
            from datetime import timedelta
            for attempt in range(12): 
                media_events = db.query(WebhookEventModel).filter(
                    WebhookEventModel.webhook_config_id == config.id,
                    WebhookEventModel.telefone == event.telefone,
                    WebhookEventModel.message_type.in_(["audio", "image"]),
                    WebhookEventModel.status.in_(["media_ready", "grouped", "completed"]), # Aceita mais status
                    WebhookEventModel.created_at >= event.created_at - timedelta(minutes=5)
                ).all()
                
                changed = False
                current_msg = event.mensagem
                for me in media_events:
                    placeholder = f"[{me.message_type.upper()} PENDENTE]"
                    
                    # Só substitui se me.mensagem for a transcrição real (não o placeholder)
                    if placeholder in current_msg and me.mensagem and placeholder not in me.mensagem:
                        content = me.mensagem
                        if me.message_type == "image":
                            content = f"[IMAGEM: {me.mensagem}]"
                        
                        # Adiciona um espaço extra após o conteúdo se ele for colado em texto
                        # mas apenas se o texto seguinte não começar com espaço/quebra
                        idx = current_msg.find(placeholder)
                        after_placeholder = current_msg[idx + len(placeholder):]
                        if after_placeholder and not after_placeholder.startswith((" ", "\n", "?", "!", ".", ",")):
                            content += " "
                            
                        current_msg = current_msg.replace(placeholder, content, 1)
                        changed = True
                
                if changed:
                    event.mensagem = current_msg
                    db.commit()
                
                if "[AUDIO PENDENTE]" not in event.mensagem and "[IMAGE PENDENTE]" not in event.mensagem:
                    _add_step(db, event_id, "✅ Mídias Resolvidas", "Todas as transcrições/análises foram integradas com sucesso.")
                    break
                
                if attempt < 11:
                    time.sleep(5)
                else:
                    _add_step(db, event_id, "⚠️ Timeout de Mídia", "Algumas mídias não terminaram a tempo. Processando com o que temos.")

        msg_type = (event.message_type or "text").lower()
        if msg_type in ["video", "document"]:
            _add_step(db, event_id, f"🚫 Mídia não suportada ({msg_type})", "Não foi possível enviar pro agente já que é um tipo mídia que não aceita.")
            event.status = "completed"
            db.commit()
            return

        # 4. Texto (Informa e continua)
        if msg_type == "text":
            _add_step(db, event_id, "📝 Mensagem de texto", "Tipo de mensagem identificado como texto. Continuando pipeline...")

        db_agent = db.query(AgentConfigModel).filter(AgentConfigModel.id == config.agent_id).first()
        if not db_agent:
            _add_step(db, event_id, "❌ Agente não encontrado", f"ID: {config.agent_id}")
            event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            event.status = "error"
            db.commit()
            return

        # --- TRAP DE AUTO-DELEÇÃO POR PALAVRA-CHAVE (PRIORIDADE MÁXIMA) ---
        mensagem = event.mensagem or ""
        msg_limpa = mensagem.strip().lower()
        if msg_limpa and config.delete_keywords:
            try:
                keywords = json.loads(config.delete_keywords)
                keyword_match = None
                for kw in keywords:
                    if kw.strip().lower() in msg_limpa:
                        keyword_match = kw.strip()
                        break
                
                if keyword_match:
                    _add_step(db, event_id, "🗑️ Auto-Deleção Detectada", f"Palavra-chave encontrada: '{keyword_match}'")
                    
                    # EXTRAIR DADOS ANTES DA DELEÇÃO (para evitar erro de instância deletada)
                    target_tel = str(event.telefone or "")
                    target_cid = str(event.conversa_id or "")
                    target_aid = str(event.conta_id or "")

                    # 1. Enviar mensagem de despedida PRIMEIRO (conforme solicitado pelo usuário)
                    farewell_msg = config.delete_message or "Seus dados foram removidos do nosso sistema. Até logo!"
                    if target_cid and target_aid:
                        _send_chatwoot_message(db, event_id, target_cid, target_aid, farewell_msg, config)
                        _add_step(db, event_id, "📤 Mensagem de despedida enviada", "Fluxo finalizado via palavra-chave.")
                        
                        # --- SUBSTITUIÇÃO DE ETIQUETAS NO CHATWOOT NO RESET ---
                        try:
                            cw_url = (config.chatwoot_url or "").rstrip("/")
                            cw_token = config.chatwoot_api_token
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
                                        _add_step(db, event_id, "🏷️ Etiquetas Substituídas no Reset", f"Etiquetas da conversa substituídas por: {reset_labels}")
                                    else:
                                        logger.warning(f"Erro ao substituir etiquetas no reset: {resp.status_code} - {resp.text}")
                        except Exception as e_lbl:
                            logger.warning(f"Erro no processamento de substituição de etiquetas: {e_lbl}")

                    # 2. Deletar tudo do banco de dados (Cascata completa)
                    if config.leads_table:
                        from sqlalchemy import text
                        # A. Buscar o ID interno do lead para garantir limpeza total
                        lid_res = db.execute(
                            text(f"SELECT id FROM {config.leads_table} WHERE telefone = :tel LIMIT 1"),
                            {"tel": target_tel}
                        ).fetchone()
                        lead_id = lid_res[0] if lid_res else None
                        
                        # Usaremos sub-transações para cada bloco de deleção ser independente
                        def _safe_delete(sql, params):
                            try:
                                db.execute(text(sql), params)
                                db.commit() # Commit parcial para garantir a deleção
                            except Exception as ex:
                                db.rollback()
                                logger.warning(f"Erro ao deletar em cascata ({sql[:30]}...): {ex}")

                        # B. Histórico de eventos (webhook_events) - Remoção cross-platform de todas as plataformas
                        _safe_delete("DELETE FROM webhook_events WHERE telefone = :tel", 
                                     {"tel": target_tel})
                        
                        # C. Memórias extraídas (user_memory)
                        _safe_delete("DELETE FROM user_memory WHERE session_id = :tel OR session_id = :lid", 
                                     {"tel": target_tel, "lid": str(lead_id) if lead_id else "---"})
                        
                        # D. Sumários de sessão
                        _safe_delete("DELETE FROM session_summaries WHERE session_id = :tel OR session_id = :lid", 
                                     {"tel": target_tel, "lid": str(lead_id) if lead_id else "---"})

                        # E. Logs de interação
                        _safe_delete("DELETE FROM interaction_logs WHERE session_id = :tel OR session_id = :lid", 
                                     {"tel": target_tel, "lid": str(lead_id) if lead_id else "---"})

                        # F. Memórias vetoriais (knowledge_items)
                        _safe_delete("DELETE FROM knowledge_items WHERE metadata_val = :tel OR metadata_val = :tel_pref", 
                                     {"tel": target_tel, "tel_pref": f"phone:{target_tel}"})

                        # G. [NOVO] Logs de Disparo e Follow-up (Scheduled Triggers e Message Status)
                        try:
                            # 1. Obter IDs dos triggers para limpar status vinculados
                            trig_ids_res = db.execute(
                                text("SELECT id FROM scheduled_triggers WHERE contact_phone = :tel"),
                                {"tel": target_tel}
                            ).fetchall()
                            trig_ids = [r[0] for r in trig_ids_res]
                            
                            if trig_ids:
                                _safe_delete("DELETE FROM message_status WHERE trigger_id = ANY(:ids)", {"ids": trig_ids})
                                
                            _safe_delete("DELETE FROM scheduled_triggers WHERE contact_phone = :tel", {"tel": target_tel})
                        except Exception as e_trig:
                            logger.warning(f"Erro ao limpar triggers no reset: {e_trig}")

                        # H. O registro do Lead propriamente dito (Limpeza do Pipeline de Follow-Up)
                        _safe_delete(f"DELETE FROM {config.leads_table} WHERE telefone = :tel", 
                                     {"tel": target_tel})
                        
                        logger.info(f"🗑️ Deleção em cascata concluída para {target_tel}")
                    
                    # 3. Limpar cache de debounce no Redis (IMPORTANTE: evita que a próxima mensagem agrupe com esta)
                    try:
                        import redis as redis_lib
                        _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
                        _redis_local.delete(f"webhook:debounce:id:{config.id}:{target_tel}")
                        _redis_local.delete(f"webhook:debounce:text:{config.id}:{target_tel}")
                    except Exception as redis_err:
                        logger.error(f"Erro ao limpar redis no reset: {redis_err}")

                    # Finalizamos o processo
                    return
            except Exception as e:
                logger.error(f"Erro no processamento de auto-deleção: {e}")
                _add_step(db, event_id, "⚠️ Erro na Auto-Deleção", str(e))

        # --- TRAP DE AUTOMAÇÃO E SEGURANÇA ---
        lead_internal_id = None
        if config.leads_table:
            try:
                from sqlalchemy import text
                _add_step(db, event_id, "🔍 Verificando status do contato", "Validando etiquetas do Chatwoot e janela de 24h...")
                
                # Buscamos apenas ID e timestamps, ignorando 'pode_enviar_mensagem' conforme solicitado pelo usuário
                query = text(f"SELECT id, ultima_mensagem_em, created_at FROM {config.leads_table} WHERE telefone = :tel LIMIT 1")
                res = db.execute(query, {"tel": event.telefone}).fetchone()
                
                lead_created_at = None
                last_msg = None
                if res:
                    lead_internal_id, last_msg, lead_created_at = res
                    # --- ATUALIZAÇÃO PROATIVA DA MENSAGEM DO USUÁRIO ---
                    try:
                        db.execute(text(f"""
                            UPDATE {config.leads_table} SET
                                mensagem = :msg,
                                message_type = :mtype,
                                link = :link,
                                ultima_mensagem_em = :now,
                                updated_at = :now,
                                conversa_id = :cid
                            WHERE id = :lid
                        """), {"msg": event.mensagem or "", "mtype": event.message_type or "text", "link": event.link, "now": get_now_utc(), "cid": event.conversa_id, "lid": lead_internal_id})
                        db.commit()
                        _add_step(db, event_id, "💾 Lead Atualizado", "Mensagem do usuário persistida com sucesso.")
                    except Exception as e_upd:
                        logger.warning(f"Erro ao atualizar mensagem do usuário no lead: {e_upd}")
                    
                # --- Sincronização Dinâmica com Chatwoot (Etiqueta de Pausa) ---
                # Agora SEMPRE verificamos as etiquetas para decidir se a automação deve rodar
                is_paused = False
                ignore_label = (config.ignore_by_label or "humano").strip().lower()
                
                try:
                    cw_url = (config.chatwoot_url or "").rstrip("/")
                    cw_token = config.chatwoot_api_token
                    if cw_url and cw_token and event.conversa_id and event.conta_id:
                        # Usamos o helper centralizado para verificar a etiqueta de pausa
                        is_paused = asyncio.run(is_conversation_paused(
                            cw_url, 
                            int(event.conta_id), 
                            int(event.conversa_id), 
                            cw_token, 
                            ignore_label
                        ))
                        
                        if is_paused:
                            _add_step(db, event_id, "🚑 Automação Pausada", f"A etiqueta '{ignore_label}' foi detectada no Chatwoot. Interrompendo processamento.")
                        else:
                            _add_step(db, event_id, "✅ Contato autorizado", f"Etiqueta '{ignore_label}' não encontrada ou inativa. Seguindo com a automação.")
                except Exception as e_sync:
                    logger.error(f"Erro na sincronização de status: {e_sync}")
                    _add_step(db, event_id, "⚠️ Erro Técnico", f"Falha ao validar etiquetas: {str(e_sync)}")

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
                                _add_step(db, event_id, "🏷️ Adicionando etiquetas automáticas", f"Etiquetas: {', '.join(labels_to_add)}")
                                asyncio.run(sync_conversation_labels(
                                    cw_url, 
                                    int(event.conta_id), 
                                    int(event.conversa_id), 
                                    cw_token, 
                                    to_add=labels_to_add
                                ))
                    except Exception as e_labels:
                        logger.error(f"Erro ao adicionar etiquetas automáticas: {e_labels}")
                        _add_step(db, event_id, "⚠️ Aviso: Etiquetas não adicionadas", f"Falha ao sincronizar etiquetas: {str(e_labels)}")

                if is_paused:
                    event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                    event.status = "ignored"
                    db.commit()
                    return
                
                # --- Verificação da Janela de 24h ---
                if last_msg:
                    # Garantir que ambos sejam aware (UTC) para comparação segura
                    msg_dt = last_msg
                    if msg_dt.tzinfo is None:
                        msg_dt = msg_dt.replace(tzinfo=timezone.utc)
                    
                    now = get_now_utc()
                    diff_seconds = (now - msg_dt).total_seconds()
                    if diff_seconds > 86400: # 24 horas
                        _add_step(db, event_id, "🔒 Janela Fechada", f"A janela de 24h expirou. Resposta cancelada por segurança.")
                        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
                        event.status = "completed"
                        db.commit()
                        return
            except Exception as e:
                logger.error(f"Erro ao verificar trap de automação: {e}")
                _add_step(db, event_id, "🔍 Aviso: Trap Ignorado", f"Erro ao verificar lead: {str(e)}")

        agent_config = _build_agent_config(db_agent)
        _add_step(db, event_id, "🤖 Conectando ao agente", f"Agente: {db_agent.name}")

        mensagem = event.mensagem or ""
        # Integrar legenda se houver (útil para imagens com texto)
        if event.legenda:
            mensagem = f"[Legenda do Usuário]: {event.legenda}\n\n[Análise/Resumo da Mídia]: {mensagem}"

        # Usar o ID interno do lead como sessionId se disponível, caso contrário usar o telefone limpo como fallback estável
        raw_phone = event.telefone or ""
        clean_phone = re.sub(r"\D", "", raw_phone)
        session_id = str(lead_internal_id) if lead_internal_id else f"tel_{clean_phone}"

        _add_step(db, event_id, "📨 Mensagem enviada ao agente", mensagem[:500] + ("..." if len(mensagem) > 500 else ""))

        # --- RECUPERAÇÃO DE HISTÓRICO (MEMÓRIA DE CONTEXTO) ---
        history = []
        if db_agent.context_window > 0:
            try:
                # Normalização robusta: buscamos pelo telefone com e sem o '+', e também pelos últimos 8 dígitos
                # para cobrir variações de 9° dígito (ex: 558596... vs 5585996...)
                search_phones = [raw_phone, clean_phone, f"+{clean_phone}"]
                search_phones = list(dict.fromkeys([p for p in search_phones if p]))

                # Extraímos os últimos 8 dígitos para busca resiliente ao nono dígito
                tel_suffix = clean_phone[-8:] if len(clean_phone) >= 8 else clean_phone

                from sqlalchemy import or_
                # Ignoramos o evento atual (event_id) para não duplicar a mensagem que está sendo processada agora
                past_events = db.query(WebhookEventModel).filter(
                    WebhookEventModel.webhook_config_id == event.webhook_config_id,
                    or_(
                        WebhookEventModel.telefone.in_(search_phones),
                        WebhookEventModel.telefone.like(f"%{tel_suffix}")  # Cobre variações do 9° dígito
                    ),
                    WebhookEventModel.id != event_id,
                    WebhookEventModel.status.in_(["completed", "processed", "delivered", "success"])  # 'success' = eventos de memória (memory webhook)
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
                
                # Truncamento final de segurança para respeitar a janela (valor configurado no agente)
                if len(history) > db_agent.context_window:
                    history = history[-db_agent.context_window:]
                
                if history:
                    num_pairs = len(past_events)
                    _add_step(db, event_id, "🧠 Memória de Contexto", f"Injetadas {num_pairs} interações ({len(history)} mensagens) como contexto.")
            except Exception as e:
                logger.error(f"Erro ao recuperar histórico para contexto: {e}")
                _add_step(db, event_id, "⚠️ Erro na Memória", "Não foi possível carregar o histórico anterior.")

        # --- EXECUÇÃO DO AGENTE ---
        async def _run():
            nonlocal mensagem
            image_url = event.link if event.message_type == "image" else None
            async with async_session() as async_db:
                # 1. Carregar agentes secundários
                secondary_agents = []
                if config.secondary_agent_ids:
                    try:
                        import json as _json
                        sec_ids = _json.loads(config.secondary_agent_ids)
                        if sec_ids:
                            from sqlalchemy import select
                            from models import AgentConfigModel
                            res = await async_db.execute(select(AgentConfigModel).where(AgentConfigModel.id.in_(sec_ids)))
                            secondary_agents = res.scalars().all()
                    except Exception as e:
                        logger.error(f"Erro ao carregar agentes secundarios: {e}")
                
                # 2. Pre-Router AI
                _add_step(db, event_id, "🧠 Analisando Intenção (Pre-Router)", "A IA está decidindo o roteamento e entendendo o contexto da mensagem...")
                db.commit()
                
                pre_router_result = await run_pre_router_ai(mensagem, history, db_agent, secondary_agents)
                
                # Exibir metadados transparentes do Pre-Router
                pr_model = pre_router_result.get("_model_used", db_agent.model or "gpt-4o-mini")
                pr_usage = pre_router_result.get("_usage", {})
                pr_prompt = pre_router_result.get("_debug_prompt", "Prompt indisponível")
                
                # Cálculo de custo manual para o Pre-Router (exibição)
                pr_cost = 0.0
                if pr_usage:
                    # Tabela de preços aproximada 2026 para exibição
                    rates = {
                        "gpt-4o-mini": {"in": 0.15 / 1_000_000, "out": 0.60 / 1_000_000},
                        "gpt-4o": {"in": 5.00 / 1_000_000, "out": 15.00 / 1_000_000}
                    }
                    rate = rates.get(pr_model, rates.get(db_agent.model) or rates["gpt-4o-mini"])
                    p_tokens = pr_usage.get("prompt_tokens", 0)
                    c_tokens = pr_usage.get("completion_tokens", 0)
                    pr_cost = (p_tokens * rate["in"]) + (c_tokens * rate["out"])

                import json as _json
                # Limpa os campos internos para o display limpo da decisão
                decision_copy = {k: v for k, v in pre_router_result.items() if not k.startswith("_")}
                
                _add_step(
                    db, 
                    event_id, 
                    "✅ Decisão da IA (Pre-Router)", 
                    f"**Decisão da IA:**\n```json\n{_json.dumps(decision_copy, ensure_ascii=False, indent=2)}\n```\n\n**Prompt Completo Analisado:**\n```text\n{pr_prompt}\n```", 
                    metadata={
                        "model": pr_model, 
                        "usage": {
                            "prompt_tokens": pr_usage.get("prompt_tokens", 0),
                            "completion_tokens": pr_usage.get("completion_tokens", 0),
                            "total_tokens": pr_usage.get("total_tokens", 0)
                        }, 
                        "cost": pr_cost
                    }
                )
                
                # A. Se for apenas saudação
                if pre_router_result.get("eh_saudacao") and pre_router_result.get("resposta_direta"):
                    _add_step(db, event_id, "👋 Saudação Detectada", "O Pre-Router gerou uma resposta direta, ignorando o agente principal.")
                    return {"content": pre_router_result.get("resposta_direta"), "usage": pr_usage, "model": pr_model, "debug": {"is_greeting": True}}
                
                # B. Se precisar de esclarecimento
                if pre_router_result.get("precisa_esclarecimento") and pre_router_result.get("resposta_esclarecimento"):
                    _add_step(db, event_id, "❓ Mensagem Ambígua", "O Pre-Router gerou uma pergunta de esclarecimento.")
                    return {"content": pre_router_result.get("resposta_esclarecimento"), "usage": pr_usage, "model": pr_model, "debug": {"needs_clarification": True}}
                    
                # 3. Preparar o agente selecionado
                target_agent_id = pre_router_result.get("id_agente_alvo")
                final_agent_config = agent_config
                final_db_agent = db_agent
                
                if target_agent_id and target_agent_id != db_agent.id:
                    from sqlalchemy import select
                    from models import AgentConfigModel
                    target_res = await async_db.execute(select(AgentConfigModel).where(AgentConfigModel.id == target_agent_id))
                    target_db_agent = target_res.scalars().first()
                    if target_db_agent:
                        final_db_agent = target_db_agent
                        final_agent_config = _build_agent_config(target_db_agent)
                        _add_step(db, event_id, f"🔀 Roteamento Efetuado", f"Mensagem roteada do principal para o Secundário: {final_db_agent.name}")
                
                # 4. Substituir a mensagem pela mensagem extraída/limpa (se disponível)
                extracted = pre_router_result.get("perguntas_extraidas")
                extracted_date = pre_router_result.get("data_extraida")
                
                # Se o pre-router extraiu uma data, injetamos como contexto para o agente principal
                if extracted_date:
                    mensagem = f"[DATA EXTRAÍDA PELO SISTEMA: {extracted_date}]\n{extracted or mensagem}"
                elif extracted and str(extracted).strip():
                    mensagem = str(extracted)
                    _add_step(db, event_id, "🧹 Mensagem Limpa/Extraída", mensagem[:1000])
                    
                result = await process_message(
                    message=mensagem,
                    history=history,
                    config=final_agent_config,
                    tools=final_db_agent.tools,
                    context_variables={
                        "account_id": int(event.conta_id) if event.conta_id and str(event.conta_id).isdigit() else 0,
                        "conversation_id": int(event.conversa_id) if event.conversa_id and str(event.conversa_id).isdigit() else 0,
                        "webhook_config_id": event.webhook_config_id,
                        "contact_phone": event.telefone,
                        "contact_name": event.contato_nome,
                        "thread_id": event.conversa_id,
                        "session_id": session_id,
                        "dias_desde_criacao": (get_now_utc() - (lead_created_at if lead_created_at.tzinfo else lead_created_at.replace(tzinfo=timezone.utc))).days if 'lead_created_at' in locals() and lead_created_at else 0
                    },

                    db=async_db,
                    image_url=image_url,
                    on_step=lambda step, detail: _add_step(db, event_id, step, detail)
                )
                
                # --- AGREGAR CUSTOS DO PRE-ROUTER (NOVO) ---
                if isinstance(result, dict) and "usage" in result and pre_router_result and "_usage" in pre_router_result:
                    pr_u = pre_router_result["_usage"]
                    m_u = result["usage"]
                    
                    if hasattr(m_u, "mini_prompt"):
                        # Se for objeto UsageLog
                        m_u.mini_prompt += pr_u.get("prompt_tokens", 0)
                        m_u.mini_completion += pr_u.get("completion_tokens", 0)
                    elif isinstance(m_u, dict):
                        # Se for dicionário
                        m_u["prompt_tokens"] = m_u.get("prompt_tokens", 0) + pr_u.get("prompt_tokens", 0)
                        m_u["completion_tokens"] = m_u.get("completion_tokens", 0) + pr_u.get("completion_tokens", 0)
                        m_u["total_tokens"] = m_u.get("total_tokens", 0) + pr_u.get("total_tokens", 0)
                
                return result

        # --- EXECUÇÃO DA IA ---
        ai_metadata = {}

        try:
            result = asyncio.run(_run())
        except Exception as ai_err:
            logger.error(f"❌ Erro crítico na execução da IA: {ai_err}")
            _add_step(db, event_id, "❌ Falha na IA", f"Ocorreu um erro ao processar a mensagem com o agente: {str(ai_err)}")
            raise ai_err # Repassa para o bloco try/except externo

        # --- ATUALIZAÇÃO DO RAIO-X COM O PROMPT FINAL RESOLVIDO ---
        # Se o process_message retornou o prompt resolvido no debug, usamos ele para total transparência
        actual_debug = result.get("debug", {}) if isinstance(result, dict) else {}
        resolved_prompt = actual_debug.get("resolved_prompt") or db_agent.system_prompt
        # Extrair RAG se disponível
        rag_context = actual_debug.get("rag_context", "")

        # Raio-X: Contexto Enviado (Atualizado com o que a IA Realmente recebeu)
        
        # Para clareza no Raio-X, adicionamos a mensagem ATUAL do usuário ao final do histórico exibido
        display_history = history.copy() if history else []
        if event.mensagem:
            display_history.append({"role": "user", "content": event.mensagem})

        # Check if this execution was bypassed by Pre-Router
        is_bypassed = False
        if isinstance(result, dict) and result.get("debug"):
            is_bypassed = result.get("debug").get("is_greeting") or result.get("debug").get("needs_clarification")

        debug_payload = {
            "modelo": result.get("model") if isinstance(result, dict) else db_agent.model,
            "prompt_sistema": resolved_prompt,
            "prompt_pre_router": pre_router_result.get("_debug_prompt") if 'pre_router_result' in locals() and pre_router_result else None,
            "contexto_rag": rag_context,
            "memoria_contexto": display_history,
            "limite_janela": db_agent.context_window,
            "metadados": {
                "session_id": session_id,
                "user_name": event.contato_nome,
                "phone": event.telefone,
            },
            "ferramentas_habilitadas": [t.name for t in db_agent.tools] if hasattr(db_agent, 'tools') else []
        }
        
        step_title = "🔍 Raio-X: Contexto Enviado"
        if is_bypassed:
            step_title += " (Ignorado)"
            
        _add_step(db, event_id, step_title, json.dumps(debug_payload, ensure_ascii=False, indent=2))
        
        # Extrair metadados da resposta
        response_text = result.get("content", "") if isinstance(result, dict) else str(result)
        ai_usage = result.get("usage") if isinstance(result, dict) else None
        
        # Converte UsageLog para dict para ser serializável em JSON
        if hasattr(ai_usage, "to_dict"):
            ai_usage = ai_usage.to_dict()

        ai_metadata = {
            "model": result.get("model") if isinstance(result, dict) else db_agent.model,
            "usage": ai_usage,
        }
        if ai_metadata["usage"]:
            # Recalcula custo se necessário passando o usage (já validado como dict ou UsageLog)
            ai_metadata["cost"] = _get_cost(ai_metadata["model"], ai_metadata["usage"])

        # --- LOG DE FERRAMENTAS ACIONADAS ---
        tool_calls = result.get("debug", {}).get("tool_calls", []) if isinstance(result, dict) else []
        if tool_calls:
            tools_summary = []
            for tc in tool_calls:
                t_name = tc.get("name", "Desconhecida")
                t_args = tc.get("args", "{}")
                t_out = tc.get("output", "Sem retorno")
                tools_summary.append(f"🛠️ **{t_name}**\n📥 Input: `{t_args}`\n📤 Output: {t_out}")
            
            _add_step(db, event_id, "🛠️ Ferramentas acionadas", "\n\n".join(tools_summary))

        resp_title = "✅ Resposta gerada pelo agente"
        if is_bypassed:
            resp_title = "⚡ Resposta direta do Pre-Router"
            
        _add_step(db, event_id, resp_title, 
                  response_text[:1000] + ("..." if len(response_text) > 1000 else ""),
                  metadata=ai_metadata)

        event.agent_response = response_text
        db.commit() # Garante que a resposta seja visível na UI imediatamente

        # --- REGISTRO FINANCEIRO (INTERACTION LOG) ---
        try:
            # Extrair tokens totais para o log financeiro
            p_tokens = 0
            c_tokens = 0
            if ai_usage:
                # O usage aqui já é um dict ou UsageLog
                if isinstance(ai_usage, dict):
                    p_tokens = ai_usage.get("prompt_tokens", 0) or (ai_usage.get("main_prompt", 0) + ai_usage.get("mini_prompt", 0))
                    c_tokens = ai_usage.get("completion_tokens", 0) or (ai_usage.get("main_completion", 0) + ai_usage.get("mini_completion", 0))
                else:
                    p_tokens = getattr(ai_usage, "prompt_tokens", 0)
                    c_tokens = getattr(ai_usage, "completion_tokens", 0)

            # Salva o log oficial para o dashboard financeiro
            new_log = InteractionLog(
                agent_id=config.agent_id,
                session_id=session_id,
                user_message=event.mensagem,
                agent_response=response_text,
                model_used=ai_metadata.get("model", db_agent.model),
                input_tokens=p_tokens,
                output_tokens=c_tokens,
                cost_usd=ai_metadata.get("cost_usd", (ai_metadata.get("cost", 0) / 6.0)), # Aproximação se faltar USD
                cost_brl=ai_metadata.get("cost", 0),
                timestamp=get_now_utc()
            )
            db.add(new_log)
            db.commit()
            _add_step(db, event_id, "💰 Registro Financeiro", f"Custo registrado: R$ {new_log.cost_brl:.4f} ({p_tokens + c_tokens} tokens)")
        except Exception as log_err:
            logger.error(f"Erro ao salvar InteractionLog no Webhook: {log_err}")
            _add_step(db, event_id, "⚠️ Erro no Financeiro", "Não foi possível registrar o custo desta interação.")

        # --- ATUALIZAÇÃO PROATIVA DA TABELA DE LEADS (MENSAGEM COMPLETA) ---
        if response_text and config.leads_table and event.telefone:
            try:
                from sqlalchemy import text
                table = config.leads_table
                db.execute(text(f"""
                    UPDATE {table} SET
                        ultima_resposta_agente = :resp,
                        ultima_resposta_agente_em = :now,
                        updated_at = :now
                    WHERE telefone = :tel AND webhook_config_id = :wid AND conversa_id = :cid
                """), {"resp": response_text, "tel": event.telefone, "wid": config.id, "cid": event.conversa_id, "now": get_now_utc()})
                db.commit()
                _add_step(db, event_id, "💾 Tabela de Leads Atualizada", "Resposta completa do agente salva de forma proativa.")
            except Exception as le:
                logger.error(f"Erro ao atualizar leads table proativamente: {le}")
                _add_step(db, event_id, "⚠️ Aviso: Falha ao salvar no Contato", str(le))
        
        # --- DELAY DE ENTREGA DA RESPOSTA ---
        response_delay = getattr(config, 'response_delay_seconds', 0) or 0
        
        # Enviar resposta ao Chatwoot se for uma mensagem válida
        if response_text and event.conversa_id and event.conta_id:
            # Chamada com splitting=True e delay entre parágrafos
            _send_chatwoot_message(
                db, event_id, event.conversa_id, event.conta_id, response_text, config,
                split_paragraphs=True, delay=response_delay
            )
            # Log final de entrega (o splitting logou as partes internamente)
        elif event.conversa_id and event.conta_id:
            # Fallback: agent produced an empty result — send a default holding message
            # so the customer is never left without any reply
            fallback_msg = getattr(config, 'fallback_empty_response', None)
            if not fallback_msg:
                fallback_msg = (
                    "Olá! Recebi sua mensagem e estou verificando as informações para te responder com precisão. "
                    "Aguarde um momento, por favor. 😊"
                )
            _add_step(db, event_id, "⚠️ Resposta Vazia - Enviando Fallback",
                      f"O agente não gerou conteúdo. Mensagem padrão enviada ao cliente: {fallback_msg[:100]}")
            _send_chatwoot_message(db, event_id, event.conversa_id, event.conta_id, fallback_msg, config)
        else:
            _add_step(db, event_id, "⚠️ Resposta Vazia", "O agente gerou uma resposta vazia e não há dados de conversa válidos para enviar fallback.")


        event.status = "completed"
        db.commit()
        _add_step(db, event_id, "🏁 Pipeline Finalizado", "Processamento concluído com sucesso.")

        # --- LIMPEZA DE DEBOUNCE (REDIS) ---
        try:
            import redis as redis_lib
            _redis_local = redis_lib.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
            phone = event.telefone
            wid = config.id
            _redis_local.delete(f"webhook:debounce:id:{wid}:{phone}")
            _redis_local.delete(f"webhook:debounce:text:{wid}:{phone}")
            logger.info(f"🧹 Limpeza de debounce concluída para {phone}")
        except Exception as redis_err:
            logger.error(f"Erro ao limpar redis: {redis_err}")

    except Exception as e:
        logger.error(f"Erro ao processar webhook event {event_id}: {e}")
        try:
            _add_step(db, event_id, "❌ Erro no processamento", str(e)[:300])
            ev = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
            if ev:
                ev.status = "error"
                ev.legenda = f"❌ Erro técnico: {str(e)[:200]}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

@app.task(bind=True, name="webhook_tasks.sync_memory_to_vector", max_retries=0)
def sync_memory_to_vector(self, event_id: int):
    db = SessionLocal()
    try:
        event = db.query(WebhookEventModel).filter(WebhookEventModel.id == event_id).first()
        if not event:
            return

        # LOG DE ENTRADA: Para entender o disparador
        _add_step(db, event_id, "🔍 Entrada no Pipeline", f"Tarefa iniciada para o evento {event_id}. Status atual no DB: {event.status}")

        # Idempotência: Se já terminou (sucesso ou erro), não reinicia.
        if event.status in ["success", "completed", "error"]:
            _add_step(db, event_id, "🚫 Sincronização Ignorada", f"O evento já está finalizado como '{event.status}'. Abortando execução para evitar loop.")
            logger.info(f"Task cancelada: Evento {event_id} já está em estado final '{event.status}'.")
            return
            
        if event.status == "processing":
             # Se está em processamento, ignoramos a menos que queiramos forçar um reset (ex: travado)
             _add_step(db, event_id, "⚠️ Pipeline em andamento", "Já existe um worker processando este evento. Abortando colisão.")
             logger.info(f"Task cancelada: Evento {event_id} já está sendo processado.")
             return

        # Limpa passos para novo monitoramento legítimo
        event.processing_steps = "[]"
        event.status = "processing"
        db.commit()

        _add_step(db, event_id, "⏳ Iniciando delay estratégico (5s)", "Aguardando estabilização dos dados conforme solicitado pelo usuário...")
        time.sleep(5)

        _add_step(db, event_id, "🔍 Iniciando sincronização vetorial", "Analisando dados recebidos via webhook para persistência em memória.")

        # 1. Extrair dados do payload
        raw = {}
        try:
            raw = json.loads(event.raw_payload or "{}")
        except:
            _add_step(db, event_id, "❌ Erro: Payload inválido", "Não foi possível decodificar o JSON do evento.")
            event.status = "error"
            db.commit()
            return

        phone = raw.get("phone") or event.telefone
        name = raw.get("name") or event.contato_nome
        facts = raw.get("facts", {})

        if not facts:
            _add_step(db, event_id, "⚠️ Nenhum fato encontrado", "O payload não contém campos de 'facts' para sincronizar.")
            event.status = "completed"
            db.commit()
            return

        _add_step(db, event_id, f"✅ Contato: {name} ({phone})", f"Processando {len(facts)} fatos extraídos.")
        
        vars_str = ", ".join([f"{k}" for k in facts.keys()])
        _add_step(db, event_id, "🛠️ Variáveis identificadas", f"Campos: {vars_str}", metadata={"facts": facts})

        # 2. Localizar KB do agente
        config = db.query(WebhookConfigModel).filter(WebhookConfigModel.id == event.webhook_config_id).first()
        if not config or not config.agent_id:
            _add_step(db, event_id, "❌ Erro: Agente não configurado", "O webhook não possui um agente vinculado para salvar a memória.")
            event.status = "error"
            db.commit()
            return

        agent = db.query(AgentConfigModel).filter(AgentConfigModel.id == config.agent_id).first()
        kb_id = agent.knowledge_base_id if agent else None
        
        if not kb_id:
            kb = db.query(KnowledgeBaseModel).first()
            if kb: kb_id = kb.id

        if not kb_id:
            _add_step(db, event_id, "❌ Erro: Base de Conhecimento inexistente", "Não foi encontrada uma base de conhecimento para este agente.")
            event.status = "error"
            db.commit()
            return

        # 3. Gerar Embeddings e Salvar
        _add_step(db, event_id, "💾 Gerando Embeddings de Memória", f"Iniciando conversão de {len(facts)} fatos em vetores pesquisáveis...")
        
        success_count = 0
        for key, value in facts.items():
            content = f"Informação de {name} ({phone}): {key} é {value}"
            _add_step(db, event_id, f"🔄 Processando campo: {key}", "Solicitando embedding à OpenAI...")
            
            try:
                # Melhorando a chamada async em ambiente sync
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                emb, usage = loop.run_until_complete(get_embedding(content))
                loop.close()
                
                if emb:
                    new_item = KnowledgeItemModel(
                        knowledge_base_id=kb_id,
                        question=f"{key} de {name}",
                        answer=str(value),
                        metadata_val=f"phone:{phone}",
                        embedding=emb,
                        category="memory_sync"
                    )
                    db.add(new_item)
                    db.commit()
                    success_count += 1
                    # Converte objeto Usage para dicionário serializável
                    usage_stats = {}
                    if usage:
                        if hasattr(usage, 'model_dump'): usage_stats = usage.model_dump()
                        elif hasattr(usage, 'dict'): usage_stats = usage.dict()
                        else: usage_stats = str(usage)

                    _add_step(db, event_id, f"✅ Salvo: {key}", f"Campo '{key}' persistido na memória vetorial.", metadata={"usage": usage_stats})
                else:
                    _add_step(db, event_id, f"🛑 Parada por Falha: {key}", "O serviço de embedding não retornou dados. Parando conforme regra anti-erro.")
                    event.status = "error"
                    db.commit()
                    return
            except Exception as loop_e:
                logger.error(f"Erro ao processar fato {key}: {loop_e}")
                _add_step(db, event_id, f"🛑 Parada por Erro: {key}", f"Erro: {str(loop_e)}. Pipeline interrompido para evitar inconsistência.")
                event.status = "error"
                db.commit()
                return

        _add_step(db, event_id, "✅ Sincronização finalizada", f"Pipeline concluído. {success_count} campos integrados à memória.")
        event.status = "completed"
        db.commit()

    except Exception as e:
        logger.error(f"Erro no sync_memory_to_vector: {e}")
        _add_step(db, event_id, "❌ Erro crítico no pipeline", str(e))
        if event:
            event.status = "error"
            db.commit()
    finally:
        db.close()




