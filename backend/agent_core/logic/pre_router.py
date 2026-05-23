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
    is_first_msg = not history or len(history) == 0
    
    # Lista de saudações comuns
    common_greetings = ["oi", "ola", "oie", "bom dia", "boa tarde", "boa noite"]
    
    # Lista de agradecimentos comuns
    common_thanks = ["obrigado", "obrigada", "valeu", "gratidao", "obrigadao", "thanks", "tanks"]
    
    # Lista de emojis de confirmação/reação comuns (inclui variações e múltiplos)
    common_emojis = ["👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿", "👌🏻", "👌🏼", "👌🏽", "👌🏾", "👌🏿", "👍", "👌", "👏", "🙌", "✌️", "❤️", "✔️", "☑️", "✅", "🆗"]
    
    # Lista de emojis negativos (insatisfação, raiva, tristeza, dedo do meio e variações de tons de pele)
    negative_emojis = ["👎🏻", "👎🏼", "👎🏽", "👎🏾", "👎🏿", "🖕🏻", "🖕🏼", "🖕🏽", "🖕🏾", "🖕🏿", "👎", "🖕", "😡", "😠", "🤬", "😕", "🙁", "☹️", "😢", "😭"]
    
    # Lista de termos de confirmação curtos comuns
    common_confirmations = ["ok", "blz", "show", "combinado", "perfeito", "certo", "beleza", "entendi", "tendi", "tá", "ta", "sim", "isso", "fechado"]
    
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
    cleaned_message = message
    
    if is_first_msg and ignore_messages:
        import re
        # Ordena anúncios pelo tamanho descendente para remover correspondências mais longas primeiro
        sorted_ads = sorted(ignore_messages, key=len, reverse=True)
        for ad_text in sorted_ads:
            ad_clean = ad_text.strip()
            if not ad_clean:
                continue
                
            # Busca insensível a maiúsculas/minúsculas para remover a parte do anúncio
            pattern = re.compile(re.escape(ad_clean), re.IGNORECASE)
            if pattern.search(cleaned_message):
                is_ad = True
                similarity_info = f"Contém anúncio: '{ad_text}'"
                cleaned_message = pattern.sub("", cleaned_message)
                logger.info(f"📢 [AD DETECTED] Removido trecho do anúncio: '{ad_text}'")
                
        # Se não detectou por substring, testa a similaridade por palavras da mensagem inteira
        if not is_ad:
            msg_words = re.findall(r'\b\w+\b', msg_clean)
            for ad_text in ignore_messages:
                ad_clean = ad_text.lower().strip()
                ad_words = re.findall(r'\b\w+\b', ad_clean)
                
                if msg_words and ad_words:
                    ad_set = set(ad_words)
                    matches = sum(1 for w in msg_words if w in ad_set)
                    pct = matches / len(msg_words)
                    if pct >= 0.60:
                        is_ad = True
                        similarity_info = f"Similaridade: {pct*100:.1f}% com '{ad_text}'"
                        cleaned_message = ""
                        logger.info(f"📢 [AD DETECTED] Mensagem similar ao anúncio configurado: {similarity_info}")
                        break

    cleaned_message = cleaned_message.strip()
    
    # Limpa pontuação para identificar se restou apenas saudação ou se a mensagem ficou vazia
    msg_clean_no_punct = cleaned_message.lower().strip()
    for char in ["?", "!", ".", ",", ";", ":", "-", "_", "(", ")", "[", "]", "{", "}"]:
        msg_clean_no_punct = msg_clean_no_punct.replace(char, "")
    msg_clean_no_punct = msg_clean_no_punct.strip()

    if (msg_clean_no_punct in common_greetings or msg_clean_no_punct == ""):
        if is_first_msg:
            resposta = getattr(main_agent, 'initial_message', None) or "Olá! Como posso ajudar?"
        else:
            resposta = "Olá! Como posso te ajudar?"

        return {
            "eh_saudacao": True,
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": resposta,
            "perguntas_extraidas": None,
            "data_extraida": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "_model_used": "shortcut-logic"
        }
    elif msg_clean_no_punct in common_thanks:
        return {
            "eh_saudacao": True,
            "eh_agradecimento": True,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id,
            "resposta_direta": "Por nada! Se precisar de mais alguma coisa, é só chamar.",
            "perguntas_extraidas": None,
            "data_extraida": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info,
            "_model_used": "shortcut-logic"
        }
    else:
        # Limpa a mensagem de emojis para verificar se sobrou texto
        msg_no_emojis = msg_clean_no_punct
        has_reaction_emoji = False
        has_negative_emoji = False
        
        for em in negative_emojis:
            if em in msg_no_emojis:
                has_negative_emoji = True
            msg_no_emojis = msg_no_emojis.replace(em, "")
            
        for em in common_emojis:
            if em in msg_no_emojis:
                has_reaction_emoji = True
            msg_no_emojis = msg_no_emojis.replace(em, "")
            
        msg_no_emojis = msg_no_emojis.strip()
        
        # Verifica se a mensagem contém apenas emojis de reação (ou se ficou vazia após removê-los)
        is_pure_emoji_reaction = (has_reaction_emoji or has_negative_emoji) and msg_no_emojis == ""
        
        # Verifica se a mensagem é um termo de confirmação curto
        is_confirmation_word = msg_clean_no_punct in common_confirmations or msg_no_emojis in common_confirmations
        
        if is_pure_emoji_reaction or is_confirmation_word:
            # Caso especial: Emoji negativo é atalho programático direto imediato,
            # ignorando se o assistente perguntou ou não no turno anterior
            if has_negative_emoji and is_pure_emoji_reaction:
                return {
                    "eh_saudacao": True,
                    "eh_agradecimento": False,
                    "eh_emoji_negativo": True,
                    "precisa_esclarecimento": False,
                    "id_agente_alvo": main_agent.id,
                    "resposta_direta": "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?",
                    "perguntas_extraidas": None,
                    "data_extraida": None,
                    "eh_anuncio": is_ad,
                    "detalhe_anuncio": similarity_info,
                    "_model_used": "shortcut-logic"
                }

            # Se for confirmação por texto ou emoji positivo, mas o assistente fez uma pergunta direta por último, não interceptamos como atalho,
            # pois o usuário pode estar respondendo a pergunta (ex: "você prefere Pix ou cartão?", "Pix")
            last_assistant_asked = False
            if history:
                for h in reversed(history):
                    if h.get("role") == "assistant":
                        content = h.get("content", "")
                        if "?" in content:
                            last_assistant_asked = True
                        break
            
            # Interceptamos se for reação de emoji pura OU (se for confirmação por texto e o assistente não perguntou por último)
            if is_pure_emoji_reaction or not last_assistant_asked:
                resposta_confirmacao = "Perfeito! Se precisar de mais alguma coisa, é só chamar. 😊"
                if "combinado" in msg_clean_no_punct:
                    resposta_confirmacao = "Combinado! Qualquer dúvida, estou por aqui. 😉"
                elif "ok" in msg_clean_no_punct:
                    resposta_confirmacao = "Combinado! Se precisar de algo, é só chamar. 👍"
                elif "certo" in msg_clean_no_punct:
                    resposta_confirmacao = "Certo! Se precisar de mais alguma ajuda, estou à disposição. 👍"
                    
                return {
                    "eh_saudacao": True,
                    "eh_agradecimento": False,
                    "precisa_esclarecimento": False,
                    "id_agente_alvo": main_agent.id,
                    "resposta_direta": resposta_confirmacao,
                    "perguntas_extraidas": None,
                    "data_extraida": None,
                    "eh_anuncio": is_ad,
                    "detalhe_anuncio": similarity_info,
                    "_model_used": "shortcut-logic"
                }

    # Se a mensagem contém algo além de saudação/anúncio, usamos o conteúdo limpo no processamento
    message = cleaned_message


    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "eh_saudacao": False, 
            "eh_agradecimento": False,
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
            history_text += f"{role}: {content}\n\n"
            
    system_prompt = f"""Você é o "Pre-Router AI", o primeiro contato que lê a mensagem do usuário antes dela ser enviada aos Agentes.
Sua função é quintupla:
1. Identificar se a mensagem é APENAS uma saudação curta, cumprimento, agradecimento (Ex: "Oi", "Olá", "Oie", "Bom dia", "Tudo bem?", "Obrigado") ou uma confirmação/reação curta (Ex: "Ok", "Entendi", "Certo", "Show", "Combinado", "👍", "👌", "Perfeito") ou emoji negativo (Ex: 👎, 🖕, 😡, 😠, 😕, 😢, 😭) OU uma mensagem de teste do usuário ("teste", "testando") e NÃO contém nenhuma pergunta ou requisição técnica.
   - SAUDAÇÃO CONFIGURADA: "{getattr(main_agent, 'initial_message', 'Olá! Como posso te ajudar hoje?')}"
   - MENSAGEM DE ANÚNCIO (IGNORAR): "{getattr(main_agent, 'initial_ignore_message', '')}"
   
   CRITÉRIO RÍGIDO: Se a mensagem for "Oi", "Oie", "Olá" ou similares curtos, você DEVE definir 'eh_saudacao' as true e usar a 'SAUDAÇÃO CONFIGURADA' como sua 'resposta_direta'.
   Se a mensagem for um AGRADECIMENTO (Ex: "Obrigado", "Obrigada", "Valeu", "Muito obrigado"), você deve definir 'eh_agradecimento' as true, 'eh_saudacao' as true e usar uma resposta simpática de agradecimento (Ex: "Por nada! Se precisar de mais alguma coisa, é só chamar.") como 'resposta_direta'.
   Se a mensagem for uma REAÇÃO NEGATIVA ou emoji de insatisfação/raiva/tristeza (Ex: 👎, 🖕, 😡, 😠, 🤬, 😕, 🙁, ☹️, 😢, 😭 e variações), você deve definir 'eh_saudacao' as true e usar a resposta empática: "Puxa, sinto muito! 😕 Percebi que algo não deu certo. O que aconteceu? Como posso te ajudar a resolver de uma forma melhor?" como 'resposta_direta'.
   Se a mensagem for uma CONFIRMAÇÃO/REAÇÃO POSITIVA (Ex: "Ok", "Entendi", "Combinado", "Certo", "Perfeito", emojis de confirmação como 👍, 👌) e o assistente não fez uma pergunta direta por último, você deve definir 'eh_saudacao' as true e usar uma resposta simpática de confirmação (Ex: "Perfeito! Qualquer dúvida, estou à disposição." ou "Combinado! Se precisar de algo, é só chamar.") como 'resposta_direta'.
   
   NOTA SOBRE HISTÓRICO: Se a mensagem for um "sim", "não", ou resposta curta que responde a uma pergunta direta do histórico recente (ex: a IA perguntou 'Qual seu e-mail?' ou 'Você prefere X ou Y?'), NÃO é apenas confirmação, é parte do fluxo da conversa, logo eh_saudacao deve ser false. (Isso não se aplica a emojis negativos como 👎 que são sempre interceptados).

2. Identificar se a mensagem atual do usuário é uma MENSAGEM AUTOMÁTICA de boas-vindas, saudação comercial ou de AUSÊNCIA enviada pelo outro lado (por exemplo, mensagens automáticas de catálogo, mensagens rápidas do WhatsApp Business do contato, saudações automáticas de consultórios/lojas, mensagens de ausência informando horário de atendimento, etc. Exemplos: "Olá, seja bem-vindo ao Jessika Albuquerque Beauty...", "Olá! No momento não posso atender...", "Aqui quem cuida de você é...", "Obrigado por sua mensagem. Entraremos em contato...").
   Se você identificar que a mensagem do usuário é uma mensagem automática/ausência/saudação do outro lado:
   - Defina 'eh_mensagem_automatica' como true.
   - Defina 'eh_saudacao' como true.
   - Defina 'resposta_direta' como a 'SAUDAÇÃO CONFIGURADA' (ou "Olá! Como posso te ajudar hoje?" se a configurada estiver vazia).
   - Defina 'perguntas_extraidas' como null ou "".

3. Se a mensagem contiver perguntas ou requisições (e não for automática), você deve extrair APENAS a(s) pergunta(s)/requisição(ões) da mensagem (removendo saudações, áudios confusos, lixo). Combine tudo em 'perguntas_extraidas'. Se houver mais de uma pergunta, junte todas.

4. Se a mensagem do usuário for TÃO vaga ou confusa que é IMPOSSÍVEL identificar qualquer intenção (ex: 'ta', 'ok', '...', '???'), defina 'precisa_esclarecimento' como true e forneça uma mensagem curta e simpática de esclarecimento em 'resposta_esclarecimento' (Ex: "Como posso te ajudar hoje?" ou "Olá! Poderia me dar mais detalhes sobre o que você precisa?").
   ⚠️ EXCEÇÃO PARA SAUDAÇÕES EM HISTÓRICO: Se a mensagem for apenas um cumprimento curto como "Oi", "Olá", "Oie", "Bom dia", "Tudo bem?" e houver histórico de conversa, NÃO a trate como vaga ou confusa e nem defina 'precisa_esclarecimento' como true. Em vez disso, defina 'eh_saudacao' as true e use a 'SAUDAÇÃO CONFIGURADA' como sua 'resposta_direta'.
   ⚠️ REGRA DE OURO ABSOLUTA: Se o usuário citar NOMES DE PESSOAS (ex: 'Mateus', 'Mirela', 'Lira'), nomes de cursos, termos técnicos ou qualquer assunto específico que possa estar no conhecimento (RAG ou Inbox), você NUNCA deve pedir esclarecimento. Defina 'precisa_esclarecimento' as false e 'id_agente_alvo' como o Agente Principal.
   
5. Se o usuário perguntar por alguém (Quem é X?), isso NUNCA é vago. Deixe o Agente Principal responder.

Baseado no que o usuário quer, escolha qual agente abaixo deve receber a mensagem:
{agents_desc}
Se estiver em dúvida, escolha SEMPRE o Agente Principal (ID: {main_agent.id}).

{get_date_context(main_agent) if getattr(main_agent, 'date_awareness', False) else ''}

Retorne SEMPRE um JSON completo com TODAS as chaves:
{{
  "eh_saudacao": boolean,
  "eh_agradecimento": boolean,
  "eh_mensagem_automatica": boolean,
  "precisa_esclarecimento": boolean,
  "resposta_direta": "string ou null",
  "resposta_esclarecimento": "string ou null",
  "id_agente_alvo": integer,
  "perguntas_extraidas": "string ou null",
  "data_extraida": "YYYY-MM-DD ou null"
}}"""

    if not is_first_msg:
        system_prompt += "\n⚠️ REGRA CRÍTICA DE HISTÓRICO: Há interações anteriores na conversa. Se a mensagem for apenas uma saudação curta ou cumprimento isolado (Ex: 'Oi', 'Olá', 'Bom dia', 'Tudo bem?'), você PODE definir 'eh_saudacao' como true e usar a 'SAUDAÇÃO CONFIGURADA' como 'resposta_direta'. Mas se o usuário trouxer qualquer dúvida, resposta ou assunto novo, trate a mensagem como continuação normal da conversa (eh_saudacao = false)."

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
        
        # Se eh_saudacao for True ou eh_mensagem_automatica for True
        if result.get("eh_saudacao") or result.get("eh_mensagem_automatica"):
            if result.get("eh_agradecimento"):
                if not result.get("resposta_direta"):
                    result["resposta_direta"] = "Por nada! Se precisar de mais alguma coisa, é só chamar."
            elif result.get("eh_mensagem_automatica"):
                result["resposta_direta"] = getattr(main_agent, 'initial_message', None) or "Olá! Como posso te ajudar hoje?"
                result["eh_saudacao"] = True
                result["perguntas_extraidas"] = None
            else:
                if is_first_msg:
                    if not result.get("resposta_direta"):
                        result["resposta_direta"] = getattr(main_agent, 'initial_message', None) or "Olá! Como posso te ajudar hoje?"
                else:
                    if not result.get("resposta_direta"):
                        # Se contiver termos de confirmação, damos uma resposta de confirmação
                        is_conf = any(term in msg_clean_no_punct for term in common_confirmations) or has_reaction_emoji
                        if is_conf:
                            result["resposta_direta"] = "Perfeito! Qualquer dúvida, estou à disposição. 😊"
                        else:
                            result["resposta_direta"] = "Olá! Como posso te ajudar?"
            
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
        result["eh_anuncio"] = result.get("eh_anuncio", False) or is_ad
        result["detalhe_anuncio"] = result.get("detalhe_anuncio", None) or similarity_info
        return result
    except Exception as e:
        logger.error(f"Erro no Pre-Router: {e}")
        return {
            "eh_saudacao": False, 
            "eh_agradecimento": False,
            "precisa_esclarecimento": False,
            "id_agente_alvo": main_agent.id, 
            "perguntas_extraidas": message,
            "resposta_direta": None,
            "resposta_esclarecimento": None,
            "data_extraida": None,
            "eh_anuncio": is_ad,
            "detalhe_anuncio": similarity_info
        }
