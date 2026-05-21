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
from .tools.handlers.internal import handle_date_calculator, handle_unanswered_question, handle_lead_qualified
from .tools.handlers.google import handle_google_calendar

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
                    "error": False,
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

    # 2. Context Window - Unificada globalmente para 5 mensagens por padrão (ou o configurado globalmente)
    target_window = config.context_window or 5
    if history and len(history) > (target_window * 2):
        history = history[-(target_window * 2):]

    client = get_openai_client(config.model)
    if not client: return {"content": "Erro: API Key não configurada.", "error": True}

    # 3. System Prompt & Variable Injection
    system_prompt = config.system_prompt
    system_prompt += "\n\n⚠️ **REGRA DE OURO:** Não use 'IA', 'Robô', 'Suporte Humano'. Use 'especialista', 'equipe'."
    system_prompt += "\n\n🚨 **PRIORIDADE DE RESPOSTA (SEGUIR À RISCA):**"
    system_prompt += "\n1. Se o usuário fizer uma pergunta sobre algo que NÃO esteja no seu PROMPT DE SISTEMA (as diretrizes/conhecimento descritos acima), no seu conhecimento (RAG) ou nas 'INSTRUÇÕES ADICIONAIS' (Inbox), use OBRIGATORIAMENTE a ferramenta 'registrar_duvida_sem_resposta' e diga que vai verificar com a equipe."
    system_prompt += "\n2. Use 'transferir_suporte_humano' APENAS se o usuário pedir EXPLICITAMENTE ('quero falar com atendente', 'me passa pra um humano', 'quero suporte humano')."
    system_prompt += "\n3. NUNCA use 'transferir_suporte_humano' apenas porque você não sabe a resposta. Para isso existe a regra 1."
    system_prompt += "\n4. NUNCA invente nomes de membros da equipe ou clientes. Se a pessoa citada não estiver no seu PROMPT DE SISTEMA, conhecimento (RAG ou Inbox), trate como dúvida (Regra 1)."
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
        
    # --- REGRAS RÍGIDAS DE INTEGRIDADE (CONTRA ALUCINAÇÃO) ---
    strict_rules = (
        "\n\n### REGRA DE OURO (COMPORTAMENTO OBRIGATÓRIO):\n"
        "1. Seu 'CONHECIMENTO OFICIAL' é composto por: (a) SEU PRÓPRIO PROMPT DE SISTEMA (instruções/informações de produtos descritas acima neste prompt), (b) CONTEXTO RAG e (c) INSTRUÇÕES ADICIONAIS (Inbox). Se a informação estiver em QUALQUER um desses lugares, você DEVE responder com confiança.\n"
        "2. Se a informação necessária NÃO estiver em nenhum desses locais, você DEVE chamar a ferramenta 'registrar_duvida_sem_resposta' ANTES de responder.\n"
        "3. É PROIBIDO inventar nomes, prazos ou políticas que não constem no seu PROMPT DE SISTEMA, RAG ou Inbox.\n"
        "4. **PROTOCOLO DE RESPOSTA DA FERRAMENTA 'registrar_duvida_sem_resposta' (OBRIGATÓRIO):**\n"
        "   - **Primeiro Turno (Acionamento da Ferramenta):** Ao chamar a ferramenta, sua resposta final para o usuário DEVE seguir estritamente este padrão: 'Vou verificar com a equipe e já te retorno certinho sobre: [pergunta do usuário reformulada de forma clara e direta].' E no final da mensagem, faça sempre alguma pergunta para o usuário como: 'Posso lhe ajudar com mais alguma dúvida?' ou similar.\n"
        "   - **Segundo Turno (Confirmação do Usuário):** Se o usuário responder apenas com concordâncias/confirmações curtas (ex: 'ok', 'blz', 'tudo bem', 'beleza', 'certo', 'combinado', 'obrigado') após você ter dito que iria verificar com a equipe, você **DEVE APENAS** responder: 'Já salvei sua pergunta aqui para o nosso time analisar. Enquanto isso, como posso te ajudar com outro assunto agora?'. **É TERMINANTEMENTE PROIBIDO** perguntar se ele quer que você passe as informações que você tem agora, oferecer passar o que você sabe, ou perguntar se ele quer aguardar, pois você NÃO possui essa informação na sua base ou prompt. Apenas confirme o salvamento da pergunta e questione se há outro assunto em que possa ajudar."
    )
    system_prompt += strict_rules

    # --- INJEÇÃO DE PERGUNTAS DE QUALIFICAÇÃO DE LEAD ---
    raw_qq = getattr(config, 'qualification_questions', None)
    if raw_qq:
        try:
            qq_list = json.loads(raw_qq) if isinstance(raw_qq, str) else raw_qq
            if isinstance(qq_list, list) and qq_list:
                qq_lines = []
                for i, q in enumerate(qq_list):
                    if isinstance(q, dict):
                        text = q.get("text", "")
                        instruction = q.get("instruction", "")
                        line = f"{i+1}. {text}"
                        if instruction:
                            line += f"\n   ↳ Instrução de validação para esta pergunta: {instruction}"
                    else:
                        line = f"{i+1}. {q}"
                    qq_lines.append(line)
                qq_formatted = "\n".join(qq_lines)
                system_prompt += (
                    "\n\n🎯 **QUALIFICAÇÃO DE LEAD — PROTOCOLO OBRIGATÓRIO:**\n"
                    "Você DEVE coletar as seguintes informações em sequência com o usuário:\n"
                    f"{qq_formatted}\n\n"
                    "REGRAS INVIOLÁVEIS:\n"
                    "- Faça UMA pergunta de qualificação por vez, aguarde a resposta antes de fazer a próxima.\n"
                    "- Só avance para a próxima pergunta após receber a resposta da anterior.\n"
                    "- Quando TODAS as respostas forem coletadas, chame IMEDIATAMENTE a ferramenta `lead_qualificado` passando todas as respostas.\n"
                    "- Você PODE (e deve) responder a qualquer dúvida do usuário sobre o produto/serviço brevemente se ele perguntar, mas você deve OBRIGATORIAMENTE incluir a pergunta qualificatória pendente logo em seguida na mesma resposta.\n"
                    "- Se o usuário tentar desviar do assunto sem fazer perguntas, redirecione de forma simpática e envie a pergunta de qualificação pendente.\n"
                    "- Após chamar a ferramenta `lead_qualificado` e receber o retorno de sucesso, sua resposta final deve ser estritamente de conclusão e agradecimento simpático, sem repetir respostas ou detalhes sobre dúvidas que você já respondeu ou explicou em turnos anteriores do histórico."
                )
        except Exception as e:
            logger.error(f"Erro ao injetar perguntas de qualificação no prompt: {e}")

    # --- INJEÇÃO DE DIRETRIZES DE SEGURANÇA E COMPORTAMENTO (PROATIVA) ---
    security_rules = ""
    lang_complexity = getattr(config, 'security_language_complexity', 'standard') or 'standard'
    if lang_complexity == 'simple':
        security_rules += "\n- **Estilo de Linguagem Simples (OBRIGATÓRIO):** Use respostas curtas, linguagem muito simples, clara e sem jargões técnicos ou comerciais complexos."
    elif lang_complexity == 'technical':
        security_rules += "\n- **Estilo de Linguagem Técnico (OBRIGATÓRIO):** Use respostas precisas, formais, completas e termos técnicos adequados."
    elif lang_complexity == 'standard':
        security_rules += "\n- **Estilo de Linguagem Padrão (OBRIGATÓRIO):** Escreva de forma natural, coloquial, amigável e fluida."

    forbidden_topics = getattr(config, 'security_forbidden_topics', None)
    if forbidden_topics:
        security_rules += f"\n- **TÓPICOS PROIBIDOS (NÃO FALE SOBRE ISSO):** Você está expressamente proibido de discutir, responder ou comentar sobre os seguintes temas: {forbidden_topics}. Caso o usuário pergunte algo sobre esses temas, desvie educadamente ou diga que não pode ajudar com esse assunto específico."

    competitor_blacklist = getattr(config, 'security_competitor_blacklist', None)
    if competitor_blacklist:
        security_rules += f"\n- **CONCORRENTES PROIBIDOS (BLACKLIST):** É estritamente proibido citar, comparar ou validar os seguintes concorrentes: {competitor_blacklist}. Se o usuário mencionar algum deles, ignore a menção, mude de assunto ou foque exclusivamente nos nossos diferenciais, sem pronunciar ou confirmar o nome do concorrente."

    discount_policy = getattr(config, 'security_discount_policy', None)
    if discount_policy:
        security_rules += f"\n- **POLÍTICA DE DESCONTOS (REGRAS RÍGIDAS DE PRECIFICAÇÃO):** Você deve seguir rigorosamente a seguinte regra para descontos ou condições especiais: {discount_policy}. NUNCA ofereça, confirme ou invente qualquer desconto ou condição que viole ou não esteja prevista nesta política."

    if security_rules:
        system_prompt += "\n\n### DIRETRIZES DE SEGURANÇA E ESTILO (SEGUIR À RISCA):\n" + security_rules

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

    # Adicionar ferramenta de Handoff se habilitada (Renomeada para consistência com o Prompt)
    if getattr(config, 'handoff_enabled', False):
        openai_tools.append({
            "type": "function",
            "function": {
                "name": "transferir_suporte_humano",
                "description": (
                    "Transfere a conversa para um atendente humano. "
                    "REGRAS RÍGIDAS: 1. Use APENAS se o usuário pedir explicitamente ('quero falar com alguém', 'me passa pra um atendente'). "
                    "2. NUNCA use se você simplesmente não souber uma resposta (para isso, use 'registrar_duvida_sem_resposta'). "
                    "3. NUNCA assuma que nomes desconhecidos são de atendentes."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "motivo": {"type": "string", "description": "Motivo real e específico solicitado pelo usuário"}
                    },
                    "required": ["motivo"]
                }
            }
        })

    # Garantir que registrar_duvida_sem_resposta esteja sempre disponível para evitar transbordos indevidos
    has_unanswered = any(t.name == "registrar_duvida_sem_resposta" for t in tools) if tools else False
    if not has_unanswered:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": "registrar_duvida_sem_resposta",
                "description": (
                    "Chame esta ferramenta APENAS quando o conhecimento (RAG) E o seu prompt de sistema não forem suficientes para responder. "
                    "Se a informação (ex: nome de um funcionário ou política) estiver no seu prompt, use-a e NÃO chame esta ferramenta. "
                    "Isso registra a dúvida para a equipe verificar depois."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pergunta": {"type": "string", "description": "A pergunta exata do usuário"}
                    },
                    "required": ["pergunta"]
                }
            }
        })

    # Adicionar ferramenta de qualificação de lead se configurada
    if getattr(config, 'qualification_questions', None):
        openai_tools.append({
            "type": "function",
            "function": {
                "name": "lead_qualificado",
                "description": (
                    "Chame esta ferramenta quando o usuário responder com sucesso todas as perguntas de qualificação. "
                    "Passe no dicionário de respostas as chaves representando cada pergunta e o valor respondido pelo usuário."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "respostas": {
                            "type": "object",
                            "description": "Objeto chave-valor contendo cada pergunta e a resposta fornecida pelo usuário"
                        }
                    },
                    "required": ["respostas"]
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
    is_handoff_terminal = False
    
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
                        "temperature": getattr(config, 'temperature', 0.1)
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
                return {"content": "❌ Desculpe, estou enfrentando uma instabilidade técnica agora. Por favor, tente novamente em instantes.", "error": True, "usage": total_usage, "model": getattr(config, 'model', 'gpt-4o-mini')}

            messages.append(response_message)
            
            # Se houver tool_calls, processá-los
            t_calls = getattr(response_message, "tool_calls", None)
            if t_calls and isinstance(t_calls, list):
                for tool_call in t_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    if on_step:
                        on_step(f"🛠️ Acionando ferramenta: {tool_name}", f"Argumentos: {json.dumps(tool_args, ensure_ascii=False)}")
                    
                    # Caso Especial: Handoff (Compatível com ambas as versões do nome por transição)
                    if tool_name in ["transferir_atendimento", "transferir_suporte_humano"]:
                        # Se for a ferramenta automática simplificada
                        destino = tool_args.get("destino", "humano")
                        motivo = tool_args.get("motivo", "Solicitado pelo usuário")
                        
                        handoff_data = {"handoff": True, "destino": destino, "motivo": motivo}
                        summary = await generate_handoff_summary(history + [messages[-2]]) 
                        handoff_data["summary"] = summary
                        
                        # Sincroniza etiquetas no Chatwoot imediatamente
                        handoff_result = await handle_chatwoot_handoff(db, context_variables, None, True, tool_args, history, config.id)
                        
                        tool_result = handoff_result
                        messages.append({"tool_call_id": tool_call.id, "role": "tool", "name": tool_name, "content": tool_result})
                        last_response = f"Entendi perfeitamente. Estou transferindo seu atendimento para nossa equipe especializada para que você receba o suporte adequado. Um momento, por favor! ✨"
                        
                        tool_calls_log.append({
                            "name": tool_name,
                            "args": json.dumps(tool_args, ensure_ascii=False),
                            "output": tool_result
                        })
                        
                        tool_calls_log.append({
                            "name": "chatwoot:sincronizacao_etiquetas",
                            "args": json.dumps({"is_human": True}, ensure_ascii=False),
                            "output": handoff_result
                        })
                        
                        detalhes_suporte = f"Destino: {destino}. Motivo: {motivo}."
                        if handoff_result and "DETALHES:" in handoff_result:
                            try:
                                # Extrair a seção de detalhes
                                partes = handoff_result.split("DETALHES: ")
                                if len(partes) > 1:
                                    detalhes_etiquetas = partes[1].split(". INSTRUÇÃO")[0]
                                    if detalhes_etiquetas and "Ação padrão" not in detalhes_etiquetas:
                                        detalhes_suporte += f"\n🏷️ {detalhes_etiquetas}"
                            except Exception as e_parse:
                                print(f"Erro ao parsear detalhes do handoff: {e_parse}")

                        if on_step:
                            on_step(f"🚑 Suporte Humano solicitado", detalhes_suporte)

                        # O handoff é terminal. Definimos o resultado e paramos o loop principal.
                        is_handoff_terminal = True
                        
                        break 

                    # Execução de Webhooks/Internal Tools
                    tool_result = "Erro: Ferramenta não encontrada."
                    target_tool = next((t for t in tools if t.name == tool_name), None) if tools else None
                    
                    # --- MAPEAMENTO DE FERRAMENTAS NATIVAS ---
                    if tool_name == "internal_date_calculator":
                        tool_result = await handle_date_calculator(json.dumps(tool_args))
                    elif tool_name == "registrar_duvida_sem_resposta":
                        tool_result = await handle_unanswered_question(db, context_variables, json.dumps(tool_args), history, config.id)
                    elif tool_name == "google_calendar_manager":
                        tool_result = await handle_google_calendar(db, context_variables, tool_args)
                    elif tool_name == "lead_qualificado":
                        tool_result = await handle_lead_qualified(db, context_variables, json.dumps(tool_args), config.id)
                    elif tool_name == "transferir_robo":
                        tool_result = await handle_chatwoot_handoff(db, context_variables, target_tool, False, tool_args, history, config.id)
                        tool_calls_log.append({
                            "name": "chatwoot:sincronizacao_etiquetas",
                            "args": json.dumps({"is_human": False}, ensure_ascii=False),
                            "output": tool_result
                        })
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
                
                # Se foi um handoff, encerramos o loop agora
                if is_handoff_terminal:
                    break
                
                # Após processar ferramentas, o loop continua para que a IA gere a resposta final baseada nos resultados
                continue
            
            # Resposta final da IA
            if response_message.content is not None:
                last_response = str(response_message.content)
            elif not last_response:
                last_response = ""
            break
            
        except Exception as e:
            print(f"❌ Erro crítico no loop do agente: {str(e)}")
            return {"content": f"Erro interno: {str(e)}", "error": True, "usage": total_usage, "model": getattr(config, 'model', 'gpt-4o-mini')}

    # 7. Filtros de Saída e Auditoria
    # Garantir que last_response seja string (importante para testes com mocks)
    last_response = str(last_response) if last_response is not None else ""
    
    # Remove tags residuais que a IA possa ter 'vazado' (Ex: {ferramenta}{...})
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}\s*\{.*?\}', '', last_response).strip()
    last_response = re.sub(r'\{[a-zA-Z0-9_-]+\}', '', last_response).strip()
    final_content = verify_output_safety(last_response, config)

    # Auditoria por IA (Double-Check)
    if getattr(config, 'security_validator_ia', False):
        try:
            if on_step:
                on_step("🛡️ Iniciando Auditoria por IA", "Verificando se a resposta gerada viola as diretrizes de segurança.")
            audit = await validate_response_ai(final_content, config)
            if not audit.get("is_safe", True):
                if on_step:
                    on_step("🚨 Bloqueio por Segurança", f"Resposta bloqueada. Motivo: {audit.get('reason')}")
                final_content = "Desculpe, não posso ajudar com este tema específico. Como posso te ajudar com outro assunto?"
            else:
                if on_step:
                    on_step("🛡️ Auditoria por IA Concluída", "A resposta gerada foi considerada segura.")
        except Exception as e_audit:
            logger.error(f"Erro ao processar auditoria de IA no core: {e_audit}")

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
            "resolved_prompt": messages[0]["content"], # Inclui RAG e Regras
            "tool_calls": tool_calls_log,
            "pre_router": pre_router_result if 'pre_router_result' in locals() else None
        }
    }
