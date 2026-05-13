import os
import json
import logging
import openai
from core.timezone import get_now_br

logger = logging.getLogger(__name__)

def get_date_context(config):
    now = get_now_br()
    return f"DATA/HORA ATUAL (BRASIL): {now.strftime('%A, %d de %B de %Y, %H:%M')}"

async def run_pre_router_ai(message: str, history: list, main_agent, secondary_agents: list = None) -> dict:
    """
    Triagem inicial da mensagem para identificar saudações, extrair datas e rotear agentes.
    """
    secondary_agents = secondary_agents or []
    
    # --- ATALHO PROGRAMÁTICO PARA SAUDAÇÃO CURTA E ANÚNCIOS ---
    msg_clean = message.lower().strip()
    msg_clean_no_punct = msg_clean.replace("?", "").replace("!", "")
    is_first_msg = not history or len(history) == 0
    
    # Lista de saudações comuns
    common_greetings = ["oi", "ola", "oie", "bom dia", "boa tarde", "boa noite"]
    
    # Lista de anúncios configurada (se houver)
    ignore_messages = []
    initial_ignore = getattr(main_agent, 'initial_ignore_message', None)
    if initial_ignore:
        try:
            ignore_messages = json.loads(initial_ignore)
            if not isinstance(ignore_messages, list):
                ignore_messages = [initial_ignore]
        except:
            ignore_messages = [initial_ignore]
    
    # Check for direct match in ignore list (Ads) - only for first message
    is_ad = False
    if is_first_msg:
        for ad_text in ignore_messages:
            if ad_text.lower().strip() == msg_clean:
                is_ad = True
                print(f"📢 [AD DETECTED] Mensagem idêntica a um anúncio configurado. Usando initial_message.")
                break

    if msg_clean_no_punct in common_greetings or is_ad:
        return {
            "eh_saudacao": True,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": getattr(main_agent, 'initial_message', "Olá! Como posso ajudar?"),
            "perguntas_extraidas": None,
            "data_extraida": None,
            "_model_used": "shortcut-logic"
        }

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"eh_saudacao": False, "id_agente_alvo": main_agent.id, "perguntas_extraidas": message}
        
    client = openai.AsyncOpenAI(api_key=api_key)
    
    agents_desc = f"1 (PRINCIPAL). ID: {main_agent.id} | Nome: {main_agent.name} | Descrição: {getattr(main_agent, 'description', 'Agente Principal')}\n"
    for idx, sa in enumerate(secondary_agents):
        agents_desc += f"{idx + 2} (SECUNDÁRIO). ID: {sa.id} | Nome: {sa.name} | Descrição: {getattr(sa, 'description', 'Agente Secundário')}\n"
        
    history_text = ""
    if history:
        history_text = "HISTÓRICO RECENTE:\n"
        for h in history:
            role = h.get('role', 'user').upper()
            content = h.get('content', '')
            history_text += f"{role}: {content}\n"
            
    system_prompt = f"""Você é o "Pre-Router AI", o primeiro contato que lê a mensagem do usuário antes dela ser enviada aos Agentes.
Sua função é tripla:
1. Identificar se a mensagem é APENAS uma saudação curta, cumprimento ou agradecimento (Ex: "Oi", "Olá", "Oie", "Bom dia", "Tudo bem?", "Obrigado") OU uma mensagem de teste do usuário ("teste", "testando") e NÃO contém nenhuma pergunta ou requisição técnica.
   - SAUDAÇÃO CONFIGURADA: "{getattr(main_agent, 'initial_message', 'Olá! Como posso ajudar?')}"
   - MENSAGEM DE ANÚNCIO (IGNORAR): "{getattr(main_agent, 'initial_ignore_message', '')}"
   
   CRITÉRIO RÍGIDO: Se a mensagem for "Oi", "Oie", "Olá" ou similares curtos, você DEVE definir 'eh_saudacao' como true e usar a 'SAUDAÇÃO CONFIGURADA' como sua 'resposta_direta'.
   
NOTA SOBRE HISTÓRICO: Se a mensagem for um "sim", "não", ou resposta curta que faz sentido dentro do histórico recente, NÃO é apenas saudação, é parte da conversa, logo eh_saudacao deve ser false.

2. Se a mensagem contiver perguntas ou requisições, você deve extrair APENAS a(s) pergunta(s)/requisição(ões) da mensagem (removendo saudações, áudios confusos, lixo). Combine tudo em 'perguntas_extraidas'. Se houver mais de uma pergunta, junte todas.

3. Se a mensagem do usuário for tão vaga ou confusa que você não consegue entender qual o problema dele ou para qual agente mandar, você deve definir 'precisa_esclarecimento' como true e gerar uma pergunta rápida em 'resposta_esclarecimento'.

4. Baseado no que o usuário quer, escolha qual agente abaixo deve receber a mensagem:
{agents_desc}
Se estiver em dúvida, escolha SEMPRE o Agente Principal (ID: {main_agent.id}).

{get_date_context(main_agent) if getattr(main_agent, 'date_awareness', False) else ''}

Retorne SEMPRE um JSON completo com TODAS as chaves:
{{
  "eh_saudacao": boolean,
  "precisa_esclarecimento": boolean,
  "resposta_direta": "string ou null",
  "resposta_esclarecimento": "string ou null",
  "id_agente_alvo": integer,
  "perguntas_extraidas": "string ou null",
  "data_extraida": "YYYY-MM-DD ou null"
}}"""

    user_prompt = f"{history_text}\nMENSAGEM ATUAL DO USUÁRIO:\n{message}"

    try:
        model_to_use = getattr(main_agent, 'router_simple_model', None) or getattr(main_agent, 'model', 'gpt-4o-mini')
        temp_to_use = 0.0
        if "o1" in model_to_use.lower() or "gpt-5" in model_to_use.lower(): temp_to_use = 1.0

        response = await client.chat.completions.create(
            model=model_to_use,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temp_to_use,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content.strip())
        
        # Metadados
        result["_model_used"] = model_to_use
        if response.usage:
            result["_usage"] = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        if not result.get("id_agente_alvo"): result["id_agente_alvo"] = main_agent.id
        return result
    except Exception as e:
        logger.error(f"Erro no Pre-Router: {e}")
        return {
            "eh_saudacao": False, 
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "resposta_direta": None,
            "resposta_esclarecimento": None,
            "data_extraida": None
        }
