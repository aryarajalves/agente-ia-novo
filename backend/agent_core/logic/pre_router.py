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
    
    # Check for match in ignore list (Ads) - only for first message
    is_ad = False
    similarity_info = None
    if is_first_msg:
        import re
        for ad_text in ignore_messages:
            ad_clean = ad_text.lower().strip()
            # 1. Comparação exata
            if ad_clean == msg_clean:
                is_ad = True
                similarity_info = f"Exata: '{ad_text}'"
                logger.info(f"📢 [AD DETECTED] Mensagem idêntica a um anúncio configurado: {similarity_info}")
                break
            
            # 2. Comparação por similaridade de palavras (mínimo 60%)
            msg_words = re.findall(r'\b\w+\b', msg_clean)
            ad_words = re.findall(r'\b\w+\b', ad_clean)
            
            if msg_words and ad_words:
                ad_set = set(ad_words)
                matches = sum(1 for w in msg_words if w in ad_set)
                pct = matches / len(msg_words)
                if pct >= 0.60:
                    is_ad = True
                    similarity_info = f"Similaridade: {pct*100:.1f}% com '{ad_text}'"
                    logger.info(f"📢 [AD DETECTED] Mensagem similar ao anúncio configurado: {similarity_info}")
                    break

    if (msg_clean_no_punct in common_greetings or is_ad) and is_first_msg:
        resposta = getattr(main_agent, 'initial_message', None) or "Olá! Como posso ajudar?"

        return {
            "eh_saudacao": True,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": resposta,
            "perguntas_extraidas": None,
            "data_extraida": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "_model_used": "shortcut-logic"
        }


    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "eh_saudacao": False, 
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "eh_anuncio": False,
            "detalhe_anuncio": None
        }
        
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

3. Se a mensagem do usuário for TÃO vaga ou confusa que é IMPOSSÍVEL identificar qualquer intenção (ex: 'ta', 'ok', '...', '???'), defina 'precisa_esclarecimento' como true.
   ⚠️ EXCEÇÃO PARA SAUDAÇÕES EM HISTÓRICO: Se a mensagem for apenas um cumprimento curto como "Oi", "Olá", "Oie", "Bom dia", "Tudo bem?" e houver histórico de conversa, NÃO a trate como vaga ou confusa. Defina 'precisa_esclarecimento' como true, mas use uma resposta simpática e natural de retorno de contato em 'resposta_esclarecimento' (Ex: "Olá! Como posso te ajudar agora?" ou "Oi! Em que posso te ajudar hoje?") em vez de perguntar de forma robótica se quer cancelar ou testar o chat.
   ⚠️ REGRA DE OURO ABSOLUTA: Se o usuário citar NOMES DE PESSOAS (ex: 'Mateus', 'Mirela', 'Lira'), nomes de cursos, termos técnicos ou qualquer assunto específico que possa estar no conhecimento (RAG ou Inbox), você NUNCA deve pedir esclarecimento. Defina 'precisa_esclarecimento' como false e 'id_agente_alvo' como o Agente Principal.
   
4. Se o usuário perguntar por alguém (Quem é X?), isso NUNCA é vago. Deixe o Agente Principal responder.

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

    if not is_first_msg:
        system_prompt += "\n⚠️ REGRA CRÍTICA DE HISTÓRICO: Há interações anteriores na conversa. NUNCA defina 'eh_saudacao' como true, pois o usuário já está em atendimento. Trate a mensagem como uma pergunta ou continuação normal da conversa."

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
        
        if not is_first_msg:
            result["eh_saudacao"] = False
            result["resposta_direta"] = None
            
        # Metadados para depuração (Raio-X)
        result["_model_used"] = model_to_use
        result["_debug_prompt"] = f"SYSTEM:\n{system_prompt}\n\nUSER:\n{user_prompt}"
        
        if response.usage:
            result["_usage"] = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        if not result.get("id_agente_alvo"): result["id_agente_alvo"] = main_agent.id
        result["eh_anuncio"] = result.get("eh_anuncio", False)
        result["detalhe_anuncio"] = result.get("detalhe_anuncio", None)
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
            "data_extraida": None,
            "eh_anuncio": False,
            "detalhe_anuncio": None
        }
