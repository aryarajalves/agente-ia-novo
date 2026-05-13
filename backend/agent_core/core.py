import json
import os
import re
import httpx
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from .clients import get_openai_client, get_anthropic_client
from .models.usage import UsageLog
from .utils import INTERNAL_CTX_KEYS, sanitize_phone_number
from .logic.classification import classify_message_complexity
from .logic.substitution import resolve_conditional_blocks
from .logic.history import generate_handoff_summary
from .logic.pre_router import run_pre_router_ai
from .security import verify_output_safety, validate_response_ai
from .memory import fetch_user_memory, update_user_memory
from .tools.handlers.chatwoot import handle_chatwoot_handoff
from .tools.handlers.internal import handle_date_calculator, handle_unanswered_question

logger = logging.getLogger(__name__)

async def process_message(
    message: str, history: list, config, tools: list = None, 
    context_variables: dict = None, db: AsyncSession = None,
    performed_tool_calls: list = None, image_url: str = None,
    on_step: callable = None
):
    active_role = "main"
    context_variables = context_variables or {}
    performed_tool_calls = performed_tool_calls if performed_tool_calls is not None else []
    
    pre_router_tokens = {"prompt": 0, "completion": 0}

    # 0. Pre-Router (Saudação, Triagem e Datas)
    # Se não houver histórico, ou se for uma mensagem curta, rodamos o Pre-Router
    # Exceto se for imagem (que já vai pro Vision)
    if not image_url and not performed_tool_calls:
        try:
            # Precisamos dos agentes secundários para o roteamento (opcional no playground)
            # Por enquanto, focamos em Saudações e Datas
            pre_router_result = await run_pre_router_ai(message, history, config)
            
            # Se for saudação, encerramos aqui com a resposta configurada
            if pre_router_result.get("eh_saudacao") and pre_router_result.get("resposta_direta"):
                usage = pre_router_result.get("_usage", {})
                return {
                    "content": pre_router_result.get("resposta_direta"),
                    "model": pre_router_result.get("_model_used", "pre-router"),
                    "usage": UsageLog(
                        mp=usage.get("prompt_tokens", 0),
                        mc=usage.get("completion_tokens", 0)
                    ),
                    "debug": {"pre_router": pre_router_result}
                }
            
            # Atualizar tokens gastos no roteamento
            pr_usage = pre_router_result.get("_usage", {})
            pre_router_tokens["prompt"] = pr_usage.get("prompt_tokens", 0)
            pre_router_tokens["completion"] = pr_usage.get("completion_tokens", 0)

            # Injetar data extraída no contexto
            if pre_router_result.get("data_extraida"):
                context_variables["data_extraida"] = pre_router_result["data_extraida"]
            
            # Usar a pergunta limpa/extraída se disponível
            if pre_router_result.get("perguntas_extraidas"):
                message = pre_router_result["perguntas_extraidas"]
                
        except Exception as e_pr:
            import traceback
            print(f"❌ ERRO CRÍTICO NO PRE-ROUTER (core.py): {str(e_pr)}")
            traceback.print_exc()
            logger.error(f"Erro no Pre-Router (core): {e_pr}")

    # 1. Cost Router
    if getattr(config, 'router_enabled', False):
        complexity = "COMPLEX" if image_url else await classify_message_complexity(message, config, history)
        active_role = "router_simple" if complexity == "SIMPLE" else "main"
        
        # Seleção de modelo baseada no papel (Role) e complexidade
        if complexity == "SIMPLE":
            config.model = getattr(config, 'router_simple_model', None) or config.model
        else:
            # Para perguntas complexas, usamos o router_complex_model (que é o 5.2 gpt configurado pelo usuário)
            config.model = getattr(config, 'router_complex_model', None) or config.model
            
        print(f"🚀 [ROTEAMENTO DE CUSTO] Complexidade: {complexity}. Modelo selecionado: {config.model} (Papel: {active_role})")

    # 2. Context Window
    settings = json.loads(config.model_settings) if isinstance(config.model_settings, str) else (config.model_settings or {})
    role_config = settings.get(active_role, {})
    target_window = role_config.get("context_window", config.context_window)
    if history and len(history) > (target_window * 2):
        history = history[-(target_window * 2):]

    client = get_openai_client(config.model)
    if not client: return {"content": "Erro: API Key não configurada.", "error": True}

    # 3. System Prompt & Variable Injection
    system_prompt = config.system_prompt
    system_prompt += "\n\n⚠️ **REGRA DE OURO:** Não use 'IA', 'Robô', 'Suporte Humano'. Use 'especialista', 'equipe'."
    system_prompt = resolve_conditional_blocks(system_prompt, context_variables)
    for k, v in context_variables.items():
        system_prompt = system_prompt.replace("{" + k + "}", str(v) if v is not None else "")
    
    # --- INJEÇÃO DE CONTEXTO TÉCNICO PARA FERRAMENTAS ---
    if context_variables:
        tech_context = "\n\n# CONTEXTO TÉCNICO (Use para preencher parâmetros de ferramentas):\n"
        has_tech_context = False
        for key in ["account_id", "conversation_id", "contact_phone", "contact_name", "webhook_config_id"]:
            if key in context_variables and context_variables[key]:
                tech_context += f"- {key}: {context_variables[key]}\n"
                has_tech_context = True
        
        if has_tech_context:
            system_prompt += tech_context
    
    messages = [{"role": "system", "content": system_prompt}]

    # 4. Memory & RAG & Dates (Simplified for brevity in core)
    session_id = context_variables.get("session_id")
    if db and session_id:
        mem = await fetch_user_memory(db, session_id)
        if mem: messages.insert(1, {"role": "system", "content": f"INFORMAÇÃO CRUCIAL:\n{mem}"})

    # (RAG Logic would go here - keeping it or moving to rag_service.py)
    # For now, let's assume RAG is handled or injected. 
    # I'll keep the RAG logic from the original file for functional parity.
    
    # --- RAG Logic ---
    rag_context = ""
    relevant_items = []
    rag_usage = None
    mini_prompt_tokens = 0
    mini_completion_tokens = 0
    main_prompt_tokens = 0
    main_completion_tokens = 0
    
    kb_ids = getattr(config, 'knowledge_base_ids', []) or ([config.knowledge_base_id] if getattr(config, 'knowledge_base_id', None) else [])
    if db and kb_ids:
        from rag_service import search_knowledge_base
        relevant_items, rag_usage = await search_knowledge_base(db=db, query=message, kb_ids=kb_ids, limit=getattr(config, 'rag_retrieval_count', 5))
        if rag_usage:
            mini_prompt_tokens += rag_usage.prompt_tokens
            mini_completion_tokens += rag_usage.completion_tokens
        if relevant_items:
            rag_context = "\n\n# CONTEXTO RAG:\n" + "\n".join([f"Perg: {i['question']}\nResp: {i['answer']}" for i in relevant_items])
            messages[0]["content"] += rag_context

    messages.extend(history)
    messages.append({"role": "user", "content": message})

    # 5. Preparar Ferramentas (Tools)
    openai_tools = []
    if tools:
        for t in tools:
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": json.loads(t.parameters_schema) if isinstance(t.parameters_schema, str) else t.parameters_schema
                }
            })

    # Adicionar ferramenta de Handoff se habilitada
    if getattr(config, 'handoff_enabled', False):
        openai_tools.append({
            "type": "function",
            "function": {
                "name": "transferir_atendimento",
                "description": "Transfere a conversa para um atendente humano ou outro setor.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "destino": {"type": "string", "enum": ["humano", "financeiro", "suporte"], "description": "Para onde transferir"},
                        "motivo": {"type": "string", "description": "Breve motivo da transferência"}
                    },
                    "required": ["destino"]
                }
            }
        })

    # 6. Loop de Execução (Turnos de Ferramentas)
    total_usage = UsageLog(0, 0, 0, 0)
    total_usage.mini_prompt += (mini_prompt_tokens + pre_router_tokens["prompt"])
    total_usage.mini_completion += (mini_completion_tokens + pre_router_tokens["completion"])
    
    handoff_data = {"handoff": False, "destino": None, "motivo": None}
    last_response = ""
    iteration = 0
    tool_calls_log = []
    
    while iteration < 5:
        iteration += 1
        try:
            # Tentar modelos (Principal -> Fallback)
            models_to_try = [config.model]
            if getattr(config, 'fallback_model', None):
                models_to_try.append(config.fallback_model)
            
            response_message = None
            for m in models_to_try:
                try:
                    curr_client = get_openai_client(m)
                    if not curr_client: continue
                    
                    api_params = {
                        "model": m,
                        "messages": messages,
                        "temperature": getattr(config, 'temperature', 0.7)
                    }
                    if openai_tools:
                        api_params["tools"] = openai_tools
                        api_params["tool_choice"] = "auto"
                    
                    completion = await curr_client.chat.completions.create(**api_params)
                    response_message = completion.choices[0].message
                    
                    # Atualizar Uso
                    if completion.usage:
                        total_usage.main_prompt += completion.usage.prompt_tokens
                        total_usage.main_completion += completion.usage.completion_tokens
                    break
                except Exception as e:
                    print(f"⚠️ Erro no modelo {m}: {str(e)}")
                    continue
            
            if not response_message:
                return {"content": "❌ Desculpe, estou enfrentando uma instabilidade técnica agora. Por favor, tente novamente em instantes.", "error": True, "usage": total_usage}

            messages.append(response_message)
            
            # Se houver tool_calls, processá-los
            if response_message.tool_calls:
                for tool_call in response_message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    if on_step:
                        on_step(f"🛠️ Acionando ferramenta: {tool_name}", f"Argumentos: {json.dumps(tool_args, ensure_ascii=False)}")
                    
                    # Caso Especial: Handoff
                    if tool_name == "transferir_atendimento":
                        handoff_data = {"handoff": True, "destino": tool_args.get("destino"), "motivo": tool_args.get("motivo")}
                        summary = await generate_handoff_summary(history + [messages[-2]]) # Inclui a última msg do user
                        handoff_data["summary"] = summary
                        
                        tool_result = f"Transferindo para {tool_args.get('destino')}..."
                        messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": tool_name, "content": tool_result})
                        last_response = f"Entendi perfeitamente. Estou transferindo seu atendimento para nossa equipe especializada em **{tool_args.get('destino').capitalize()}** para que você receba o suporte adequado. Um momento, por favor! ✨"
                        
                        tool_calls_log.append({
                            "name": tool_name,
                            "args": json.dumps(tool_args, ensure_ascii=False),
                            "output": tool_result
                        })
                        
                        if on_step:
                            on_step(f"🚑 Suporte Humano solicitado", f"Destino: {tool_args.get('destino')}. Motivo: {tool_args.get('motivo')}")
                        continue

                    # Execução de Webhooks/Internal Tools
                    tool_result = "Erro: Ferramenta não encontrada."
                    target_tool = next((t for t in tools if t.name == tool_name), None) if tools else None
                    
                    # --- MAPEAMENTO DE FERRAMENTAS NATIVAS ---
                    if tool_name == "transferir_suporte_humano":
                        tool_result = await handle_chatwoot_handoff(db, context_variables, target_tool, True, tool_args, history, config.id)
                    elif tool_name == "transferir_robo":
                        tool_result = await handle_chatwoot_handoff(db, context_variables, target_tool, False, tool_args, history, config.id)
                    elif tool_name == "internal_date_calculator":
                        tool_result = await handle_date_calculator(json.dumps(tool_args))
                    elif tool_name == "registrar_duvida_sem_resposta":
                        tool_result = await handle_unanswered_question(db, context_variables, json.dumps(tool_args), history, config.id)
                    elif target_tool:
                        # Webhooks externos
                        try:
                            async with httpx.AsyncClient(timeout=30.0) as http_client:
                                res = await http_client.post(target_tool.webhook_url, json={**tool_args, **context_variables})
                                tool_result = res.text
                        except Exception as e:
                            # MENSAGEM DE ERRO AMIGÁVEL (Solicitado pelo usuário)
                            # Retornamos uma instrução para a IA ao invés do erro técnico bruto
                            logger.error(f"Erro na execução da ferramenta {tool_name}: {str(e)}")
                            tool_result = (
                                "ERRO: A ferramenta encontrou uma instabilidade temporária. "
                                "INSTRUÇÃO PARA IA: Peça desculpas ao usuário de forma elegante, diga que houve uma instabilidade "
                                "passageira e peça para ele enviar a solicitação novamente em instantes. "
                                "NÃO EXIBA DETALHES TÉCNICOS DO ERRO."
                            )
                    
                    if on_step:
                        on_step(f"✅ Ferramenta {tool_name} finalizada", f"Retorno: {tool_result[:500]}...")
                    
                    messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": tool_name, "content": tool_result})
                    
                    tool_calls_log.append({
                        "name": tool_name,
                        "args": json.dumps(tool_args, ensure_ascii=False),
                        "output": tool_result
                    })
                
                # Após processar ferramentas, o loop continua para que a IA gere a resposta final baseada nos resultados
                continue
            
            # Resposta final da IA
            last_response = response_message.content or ""
            break
            
        except Exception as e:
            print(f"❌ Erro crítico no loop do agente: {str(e)}")
            return {"content": f"Erro interno: {str(e)}", "error": True, "usage": total_usage}

    # 7. Filtros de Saída e Auditoria
    # Remove tags residuais que a IA possa ter 'vazado' (Ex: {ferramenta}{...})
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}\s*\{.*?\}', '', last_response).strip()
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}', '', last_response).strip()
    
    final_content = verify_output_safety(last_response, config)

    # 7.1 Mensagem de Primeira Pergunta (Append)
    # Se for a primeira mensagem da história e houver uma mensagem de pergunta configurada,
    # anexamos ela ao final da resposta.
    is_first_msg = not history or len(history) == 0
    init_q_msg = getattr(config, 'initial_question_message', None)
    if is_first_msg and init_q_msg and final_content:
        # Só anexa se não for erro e se não for uma resposta curta de esclarecimento (vinda do pre-router)
        # Na verdade, se chegou aqui, passou pelo pre-router e foi para o agente principal.
        if not final_content.endswith(init_q_msg):
            final_content = f"{final_content}\n\n{init_q_msg}"
    
    # 8. Memória (Auto-update se configurado)
    if db and session_id and last_response:
        await update_user_memory(db, session_id, message, last_response)

    # Capturar tool_calls realizados (já temos performed_tool_calls ou similar?)
    # O loop `while iteration < 5:` já não captura `tool_calls` para exportar.
    # Na verdade, em webhook_tasks.py ele faz: `result.get("debug", {}).get("tool_calls", [])`
    
    return {
        "content": final_content,
        "usage": total_usage,
        "model": config.model,
        "handoff_data": handoff_data,
        "error": False,
        "debug": {
            "iterations": iteration,
            "rag_items": [i['id'] for i in relevant_items] if relevant_items else [],
            "resolved_prompt": system_prompt,
            "tool_calls": tool_calls_log
        }
    }
