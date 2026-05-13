from ..clients import get_openai_client

async def summarize_history(history: list) -> dict:
    client = get_openai_client()
    if not client: return {"text": "Erro: Chave API.", "usage": None}
    messages_text = ""
    for msg in history:
        role = "Usuário" if msg.get("role") == "user" else "Agente"
        content = msg.get("content") or "(Chamada de Ferramenta)"
        messages_text += f"{role}: {content}\n"
    try:
        from config_store import format_ai_params
        kwargs = format_ai_params("gpt-4o-mini", "gpt-4o-mini", {
            "messages": [{"role": "system", "content": "Resuma esta conversa em 3 parágrafos."}, {"role": "user", "content": messages_text}],
            "temperature": 0.5
        })
        response = await client.chat.completions.create(**kwargs)
        return {"text": response.choices[0].message.content, "usage": response.usage}
    except Exception as e: return {"text": f"Erro: {str(e)}", "usage": None}

async def extract_questions_from_history(history: list) -> dict:
    client = get_openai_client()
    if not client: return {"questions": [], "usage": None}
    messages_text = ""
    for msg in history:
        role = "Usuário" if msg.get("role") == "user" else "Agente"
        content = msg.get("content") or ""
        messages_text += f"{role}: {content}\n"
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "Liste todas as perguntas feitas pelo USUÁRIO nesta conversa."}, {"role": "user", "content": messages_text}],
            temperature=0.3
        )
        text = response.choices[0].message.content
        questions = [q.strip() for q in text.split('\n') if q.strip()]
        return {"questions": questions, "usage": response.usage}
    except Exception as e: return {"questions": [f"Erro: {str(e)}"], "usage": None}

async def generate_handoff_summary(history: list) -> str:
    client = get_openai_client()
    if not client: return "Resumo indisponível."
    messages_text = ""
    for msg in history:
        role = "Usuário" if msg.get("role") == "user" else "Agente"
        content = msg.get("content") or "(Ação)"
        messages_text += f"{role}: {content}\n"
    prompt = "Gere um resumo CONCISO em 4 pontos: 1. Nome do Cliente, 2. Produto/Serviço, 3. Problema/Desejo, 4. Próximo Passo."
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": messages_text}],
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception as e: return f"Erro: {str(e)}"
