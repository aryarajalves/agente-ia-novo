import json
import os
from sqlalchemy import select
from models import WebhookConfigModel, SupportRequestModel

async def handle_chatwoot_handoff(db, context_variables, target_tool, is_human, func_args_str, history, config_id):
    try:
        handoff_custom_message = None
        wid = context_variables.get("webhook_config_id")
        webhook_overrides = False
        labels_add, labels_remove = [], []
        
        # 1. Tentar buscar configurações específicas do Webhook
        if wid:
            try:
                config_res = await db.execute(select(WebhookConfigModel).where(WebhookConfigModel.id == int(wid)))
                config_obj = config_res.scalar_one_or_none()
                if config_obj:
                    if is_human:
                        labels_add = json.loads(config_obj.handoff_labels_to_add) if config_obj.handoff_labels_to_add else []
                        labels_remove = json.loads(config_obj.handoff_labels_to_remove) if config_obj.handoff_labels_to_remove else []
                        handoff_custom_message = config_obj.handoff_message
                    else:
                        labels_add = json.loads(config_obj.ai_handoff_labels_to_add) if config_obj.ai_handoff_labels_to_add else []
                        labels_remove = json.loads(config_obj.ai_handoff_labels_to_remove) if config_obj.ai_handoff_labels_to_remove else []
                        handoff_custom_message = config_obj.ai_handoff_message
                    webhook_overrides = True
            except Exception as e:
                print(f"⚠️ Erro ao buscar overrides de webhook no handoff: {e}")

        # 2. Se não houver override no webhook, usar o que está na ferramenta
        if not webhook_overrides and target_tool:
            try:
                labels_add = json.loads(target_tool.labels_to_add) if target_tool.labels_to_add else []
                labels_remove = json.loads(target_tool.labels_to_remove) if target_tool.labels_to_remove else []
                handoff_custom_message = target_tool.confirmation_message
            except Exception as e:
                print(f"⚠️ Erro ao buscar labels da ferramenta no handoff: {e}")

        account_id = context_variables.get("account_id")
        conversation_id = context_variables.get("conversation_id")
        cw_url = os.getenv("CHATWOOT_URL")
        cw_token = os.getenv("CHATWOOT_API_TOKEN")
        
        # Sincronizar Etiquetas no Chatwoot
        if cw_url and cw_token and account_id and conversation_id:
            from chatwoot_utils import sync_conversation_labels
            try:
                await sync_conversation_labels(cw_url, int(account_id), int(conversation_id), cw_token, labels_add, labels_remove)
            except Exception as e_sync:
                print(f"⚠️ Erro na sincronização de labels Chatwoot: {e_sync}")

        # Registro de Suporte no DB
        args_obj = {}
        try: 
            if isinstance(func_args_str, str):
                args_obj = json.loads(func_args_str)
            elif isinstance(func_args_str, dict):
                args_obj = func_args_str
        except: pass
        
        support_reason = args_obj.get("motivo") or args_obj.get("problema")
        if not support_reason:
            for msg in reversed(history):
                if msg.get("role") == "user":
                    support_reason = msg.get("content")
                    break
        
        from agent_core.memory import delete_all_user_memory
        
        new_support = SupportRequestModel(
            agent_id=config_id,
            webhook_config_id=wid,
            session_id=context_variables.get("session_id") or "desconhecida",
            user_name=context_variables.get("contact_name") or "Usuário Chatwoot",
            user_email=context_variables.get("contact_email") or context_variables.get("email"),
            contact_phone=context_variables.get("contact_phone") or context_variables.get("session_id"),
            status="OPEN",
            reason=support_reason or "Transbordo automático",
            account_id=str(account_id) if account_id else None,
            conversation_id=str(conversation_id) if conversation_id else None,
            extracted_data=args_obj
        )
        db.add(new_support)
        await db.commit()

        # Limpar memória de toda a sessão para evitar loops de transbordo indevidos ou contextos obsoletos
        await delete_all_user_memory(db, context_variables.get("session_id"))
        default_msg = "Encaminhamento para especialista concluído." if is_human else "Retorno ao atendimento automático concluído."
        msg_base = handoff_custom_message or default_msg
        
        # Log rico em detalhes para transparência no Pipeline
        detalhes = []
        if labels_add: detalhes.append(f"Etiquetas Adicionadas: {labels_add}")
        if labels_remove: detalhes.append(f"Etiquetas Removidas: {labels_remove}")
        if handoff_custom_message: detalhes.append(f"Mensagem enviada: \"{handoff_custom_message}\"")
        
        detalhes_str = " | ".join(detalhes) if detalhes else "Ação padrão executada."
        
        return f"RESULTADO: {msg_base}. DETALHES: {detalhes_str}. INSTRUÇÃO: Confirme ao usuário que a solicitação foi processada."
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"Erro na automação Chatwoot: {str(e)}"


