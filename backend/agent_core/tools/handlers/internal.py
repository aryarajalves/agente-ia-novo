import json
import logging
from datetime import datetime
from ...clients import get_openai_client

logger = logging.getLogger(__name__)

async def handle_date_calculator(func_args_str):
    try:
        func_args = json.loads(func_args_str)
        desc = func_args.get("date_description")
        mini_client = get_openai_client()
        now_str = datetime.now().strftime("%Y-%m-%d (%A)")
        mini_response = await mini_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"Calcule a data exata. Hoje é {now_str}. Retorne: 'YYYY-MM-DD (Dia da Semana)'."},
                {"role": "user", "content": f"Qual a data de: {desc}?"}
            ],
            temperature=0.0
        )
        return mini_response.choices[0].message.content
    except Exception as e: return f"Erro ao calcular data: {str(e)}"

async def handle_unanswered_question(db, context_variables, func_args_str, history, agent_id):
    try:
        from models import UnansweredQuestionModel
        func_args = json.loads(func_args_str)
        question = func_args.get("pergunta")
        
        # Prioriza o telefone real do contato se estiver disponível nas variáveis de contexto
        session_id = context_variables.get("contact_phone") or context_variables.get("session_id") or "Desconhecida"
        
        context_text = f"Sessão: {session_id}\nHistórico:\n" + "\n".join([f"{m.get('role')}: {m.get('content')}" for m in history[-5:]])
        new_q = UnansweredQuestionModel(agent_id=agent_id, session_id=session_id, question=question, context=context_text, status="PENDENTE")
        if db:
            db.add(new_q)
            await db.commit()
            return "Dúvida registrada para nossa equipe."
        return "Erro: Sem conexão com banco."
    except Exception as e: return f"Erro ao registrar dúvida: {str(e)}"

async def handle_lead_qualified(db, context_variables, func_args_str, agent_id):
    try:
        from models import AgentConfigModel, WebhookConfigModel
        from chatwoot_utils import sync_conversation_labels
        from sqlalchemy import select
        
        func_args = json.loads(func_args_str)
        respostas = func_args.get("respostas", {})
        
        # 1. Print destacado no console do backend
        print("\n" + "="*80)
        print("🎯 LEAD QUALIFICADO IDENTIFICADO!")
        print(f"Agente ID: {agent_id}")
        print(f"Contato: {context_variables.get('contact_name')} ({context_variables.get('contact_phone')})")
        print("Respostas Coletadas:")
        print(json.dumps(respostas, ensure_ascii=False, indent=2))
        print("="*80 + "\n", flush=True)
        
        logger.info(f"Lead qualificado identificado para agente {agent_id}. Respostas: {json.dumps(respostas, ensure_ascii=False)}")
        
        # 2. Salvar no banco de dados na coluna respostas_qualificacao do lead correspondente
        leads_table = context_variables.get("leads_table")
        phone = context_variables.get("contact_phone")
        
        if db and leads_table and phone:
            from sqlalchemy import text
            respostas_str = json.dumps(respostas, ensure_ascii=False)
            update_query = f"""
                UPDATE {leads_table} SET 
                    respostas_qualificacao = :respostas,
                    labels = CASE 
                        WHEN labels IS NULL OR labels = '' THEN 'qualificado'
                        WHEN labels NOT LIKE '%qualificado%' THEN labels || ',qualificado'
                        ELSE labels
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telefone = :phone
            """
            await db.execute(text(update_query), {"respostas": respostas_str, "phone": phone})
            await db.commit()
            logger.info(f"Respostas de qualificação salvas na tabela {leads_table} para o telefone {phone}")
            
        # 3. Adicionar as etiquetas do Chatwoot
        if db:
            agent_res = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
            agent = agent_res.scalars().first()
            
            to_add = []
            if agent and agent.qualification_labels:
                try:
                    to_add = json.loads(agent.qualification_labels)
                except Exception:
                    pass
            
            if isinstance(to_add, list):
                to_add = [str(x) for x in to_add]
            else:
                to_add = []
                
            if "qualificado" not in to_add:
                to_add.append("qualificado")
                
            # Buscar webhook para credenciais
            wh_res = await db.execute(
                select(WebhookConfigModel)
                .where(WebhookConfigModel.agent_id == agent_id)
                .limit(1)
            )
            wh = wh_res.scalars().first()
            if not wh:
                wh_sec_res = await db.execute(
                    select(WebhookConfigModel)
                    .where(WebhookConfigModel.secondary_agent_ids.like(f"%{agent_id}%"))
                    .limit(1)
                )
                wh = wh_sec_res.scalars().first()
                
            account_id = context_variables.get("account_id")
            conversation_id = context_variables.get("conversation_id")
            
            # --- FALLBACK DE CREDENCIAIS DO CHATWOOT ---
            import os
            cw_url = None
            api_token = None
            
            if wh and wh.chatwoot_url and wh.chatwoot_api_token:
                cw_url = wh.chatwoot_url.rstrip("/")
                api_token = wh.chatwoot_api_token
            else:
                cw_url = os.getenv("CHATWOOT_URL")
                api_token = os.getenv("CHATWOOT_API_TOKEN")
                if cw_url:
                    cw_url = cw_url.rstrip("/")
                if not account_id:
                    account_id = os.getenv("CHATWOOT_ACCOUNT_ID")
            
            # Tentar recuperar account_id no banco com o último evento se ainda for nulo
            if not account_id and wh:
                from models import WebhookEventModel
                evt_result = await db.execute(
                    select(WebhookEventModel.conta_id)
                    .where(WebhookEventModel.webhook_config_id == wh.id)
                    .where(WebhookEventModel.conta_id.isnot(None))
                    .order_by(WebhookEventModel.created_at.desc())
                    .limit(1)
                )
                db_account_id = evt_result.scalar()
                if db_account_id:
                    account_id = db_account_id
            
            if cw_url and api_token and account_id and conversation_id:
                await sync_conversation_labels(
                    cw_url=cw_url,
                    account_id=int(account_id),
                    conversation_id=int(conversation_id),
                    token=api_token,
                    to_add=to_add
                )
                logger.info(f"Etiquetas de qualificação sincronizadas no Chatwoot para conversa {conversation_id}: {to_add}")
                return f"Lead qualificado com sucesso. Etiquetas sincronizadas na conversa: {', '.join(to_add)}"
            
            if to_add:
                return f"Lead qualificado com sucesso (salvo localmente). Etiquetas configuradas: {', '.join(to_add)}"
                
        return "Lead qualificado com sucesso."
    except Exception as e:
        logger.error(f"Erro ao processar lead qualificado: {e}")
        return f"Erro ao qualificar lead: {str(e)}"

