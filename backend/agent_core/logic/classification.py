from ..clients import get_openai_client

def _resolve_llm_model(config=None) -> str:
    if config is None: return "gpt-4o-mini"
    if getattr(config, 'router_enabled', False):
        simple = getattr(config, 'router_simple_model', None)
        if simple: return simple
        fallback = getattr(config, 'router_simple_fallback_model', None)
        if fallback: return fallback
    return "gpt-4o-mini"

async def classify_initial_intent(message: str, config) -> str:
    message_clean = message.strip().lower()
    greetings = ["oi", "ola", "olá", "oie", "bom dia", "boa tarde", "boa noite", "tudo bem", "opa", "oi tudo bem", "ola tudo bem"]
    if message_clean in greetings or len(message_clean) <= 4: return "GREETING"
    
    model = getattr(config, "router_simple_model", "gpt-4o-mini") or "gpt-4o-mini"
    client = get_openai_client(model)
    if not client: return "QUESTION"
    
    try:
        prompt = f"""Você é um classificador de intenção de mensagens iniciais.
Analise se o usuário está apenas iniciando uma conversa (saudação ou lead vindo de anúncio) ou se ele já fez uma PERGUNTA técnica específica.
Mensagem do Usuário: "{message}"
Responda APENAS com a palavra 'GREETING' ou 'QUESTION'."""
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": message}],
            temperature=0, max_tokens=5
        )
        result = response.choices[0].message.content.strip().upper()
        return "GREETING" if "GREETING" in result else "QUESTION"
    except: return "QUESTION"

async def classify_message_complexity(message: str, config, history: list = None) -> str:
    # Usa o modelo simples configurado ou o principal como fallback para a classificação
    model_to_classify = getattr(config, "router_simple_model", None) or getattr(config, "model", "gpt-4o-mini")
    client = get_openai_client(model_to_classify)
    
    if not client: return "COMPLEX"
    last_agent_msg = ""
    if history:
        for m in reversed(history):
            if m.get("role") == "assistant":
                last_agent_msg = m.get("content", "")
                break
    prompt = f"""Você é um classificador de complexidade para roteamento de custo de IA.
Sua tarefa é decidir se a mensagem deve ser processada por um modelo simples/barato (SIMPLE) ou um modelo complexo/caro (COMPLEX).

- 'SIMPLE': Mensagens de saudação curta (oi, tudo bem), agradecimentos (obrigado, valeu), mensagens de teste (teste, testando), confirmações (sim, ok) ou negativas curtas (não).
- 'COMPLEX': Qualquer pergunta sobre o produto/serviço, dúvidas sobre preços/curso, pedidos de suporte técnico, solicitações de agendamento ou qualquer assunto que exija usar a base de conhecimento.

MENSAGEM DO USUÁRIO: "{message}"
{"ÚLTIMA FALA DO AGENTE: " + last_agent_msg if last_agent_msg else ""}

Responda APENAS com a palavra: SIMPLE ou COMPLEX."""
    try:
        response = await client.chat.completions.create(
            model=model_to_classify,
            messages=[{"role": "system", "content": prompt}],
            temperature=0.0, max_tokens=10
        )
        result = response.choices[0].message.content.strip().upper()
        return "SIMPLE" if "SIMPLE" in result else "COMPLEX"
    except: return "COMPLEX"
