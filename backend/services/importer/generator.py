from typing import List, Dict, Any
from .processor import extract_json_list

async def generate_qa_from_text(text_chunk: str, num_questions: int = 2, model: str = "gpt-4o-mini") -> tuple[List[Dict[str, str]], Dict[str, Any] | None]:
    """Uses OpenAI to generate concise Q&A pairs from a text chunk."""
    from agent import get_openai_client
    from config_store import get_real_model_id
    
    api_model = get_real_model_id(model)
    client = get_openai_client(model)
    if not client: return [], None

    prompt = f"""
    Você é um especialista em análise de documentos. 
    Abaixo está um trecho de um texto. Sua tarefa é extrair e transformar esse conhecimento em EXATAMENTE {num_questions} pares de Pergunta e Resposta.
    Texto:
    ---
    {text_chunk}
    ---
    Regras:
    1. Baseie-se apenas no texto fornecido.
    2. Seja claro e objetivo.
    3. Retorne APENAS o JSON puro:
    [ {{"pergunta": "...", "resposta": "...", "categoria": "Trecho do Documento", "trecho_original": "Citação exata", "pagina": N}} ]
    """

    try:
        from config_store import MODEL_INFO
        model_config = MODEL_INFO.get(model, {})
        is_o1_model = api_model.startswith("o1") or not model_config.get("supports_temperature", True)
        
        call_kwargs = {"model": api_model, "messages": [{"role": "user", "content": prompt}]}
        if is_o1_model: call_kwargs["max_completion_tokens"] = 1000
        else: call_kwargs["max_tokens"] = 1000

        response = await client.chat.completions.create(**call_kwargs)
        usage = {"input_tokens": response.usage.prompt_tokens, "output_tokens": response.usage.completion_tokens, "model": api_model, "family": model}
        content = response.choices[0].message.content.strip()
        return extract_json_list(content), usage
    except Exception as e:
        print(f"DEBUG ERROR: Error generating Q&A: {e}")
        return [], None

async def generate_global_qa(full_text: str, total_questions: int = 10, user_suggestions: str = None, extraction_type: str = 'suggestions', model: str = "gpt-4o-mini") -> tuple[List[Dict[str, str]], Dict[str, Any] | None]:
    """Orchestrator for global QA extraction."""
    from config_store import get_real_model_id
    try:
        api_model = get_real_model_id(model)
        char_limit = 2000000 if "gemini" in api_model.lower() else 500000
        safe_text = full_text[:char_limit]

        if not safe_text.strip(): return [], {}

        try:
            qa_list, usage = await _call_global_qa_api(safe_text, total_questions, user_suggestions, extraction_type, api_model, model)
            if not qa_list and api_model != "gpt-4o-mini":
                qa_list, usage = await _call_global_qa_api(safe_text, total_questions, user_suggestions, extraction_type, "gpt-4o-mini", "gpt-4o-mini")
            return qa_list, usage
        except Exception as api_err:
            print(f"⚠️ Primary model {api_model} failed: {api_err}. Trying fallback...")
            return await _call_global_qa_api(safe_text, total_questions, user_suggestions, extraction_type, "gpt-4o-mini", "gpt-4o-mini")
    except Exception as e:
        print(f"DEBUG ERROR: Global QA Orchestrator Error: {e}")
        return [], {}

async def _call_global_qa_api(text: str, count: int, suggestions: str, ext_type: str, api_model: str, family: str):
    """Internal helper to call the LLM and parse JSON."""
    from agent import get_openai_client
    from config_store import MODEL_INFO
    
    client = get_openai_client(api_model)
    if not client: return [], {}

    model_config = MODEL_INFO.get(family, {})
    is_o1_model = api_model.startswith("o1") or api_model.startswith("gpt-5") or not model_config.get("supports_temperature", True)
    category_label = "Extração Direta" if ext_type == "specific" else "Documento"

    if ext_type == "specific" and suggestions:
        lines = [l.strip() for l in suggestions.split('\n') if l.strip()]
        q_list_str = '\n'.join([f'- {q}' for q in lines])
        suggestions_prompt = f"O usuário forneceu perguntas EXATAS: {q_list_str}"
    else:
        suggestions_prompt = f"Fio Condutor: '{suggestions}'"

    prompt = f"""
    Você é um Especialista em Gestão de Conhecimento.
    OBJETIVO: {f"Responder detalhadamente às {count} perguntas." if ext_type == "specific" else f"Extrair conceitos-chave em até {count} pares de P&R."}
    DOCUMENTO: {text[:5000]}...
    REQUISITOS: Profundidade útil, tom pedagógico, fidelidade absoluta, citação obrigatória.
    {suggestions_prompt}
    FORMATO JSON: [ {{"pergunta": "...", "resposta": "...", "categoria": "{category_label}", "trecho_original": "...", "pagina": 1}} ]
    """

    messages = []
    if is_o1_model:
        messages.append({"role": "user", "content": prompt})
    else:
        messages.append({"role": "system", "content": "Você é um assistente especializado em extrair conhecimento profundo."})
        messages.append({"role": "user", "content": prompt})

    call_kwargs = {"model": api_model, "messages": messages}
    if is_o1_model: call_kwargs["max_completion_tokens"] = 8000
    else:
        call_kwargs["temperature"] = 0.4
        call_kwargs["max_tokens"] = 8000 

    response = await client.chat.completions.create(**call_kwargs)
    usage = {"input_tokens": response.usage.prompt_tokens, "output_tokens": response.usage.completion_tokens, "model": api_model, "family": family}
    return extract_json_list(response.choices[0].message.content), usage
