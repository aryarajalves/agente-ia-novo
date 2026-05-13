import json
from .providers import call_rag_llm

async def rerank_results(query: str, items: list[dict], model: str = "gpt-4o-mini", fallback: str = None, q_label: str = "Pergunta", a_label: str = "Resposta", m_label: str = "Metadado"):
    """Uses LLM to re-rank the top results for maximum precision."""
    if not items or len(items) <= 1:
        return items, None
        
    try:
        # Prepare the list for the LLM to evaluate
        context_to_rank = ""
        for i, item in enumerate(items):
            meta_str = f"{m_label}: {item.get('metadata_val', '')}\n" if item.get('metadata_val') else ""
            context_to_rank += f"[{i}] {meta_str}{q_label}: {item['question']}\n{a_label}: {item['answer']}\n\n"
            
        prompt = f"""
Sua tarefa é reordenar os conhecimentos abaixo do mais relevante para o menos relevante em relação à Pergunta do Usuário.

Pergunta do Usuário: "{query}"

Conhecimentos Disponíveis:
{context_to_rank}

Responda APENAS com uma lista JSON de índices na nova ordem de importância.
Exemplo de resposta: [2, 0, 1]
"""
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.choices[0].message.content.strip()
        try:
            # Tenta limpar markdown se houver
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Remove possíveis textos explicativos antes/depois do JSON
            if content.find("[") != -1:
                content = content[content.find("["):content.rfind("]")+1]
            elif content.find("{") != -1:
                content = content[content.find("{"):content.rfind("}")+1]

            new_order = json.loads(content)
            if isinstance(new_order, dict) and new_order.values():
                 new_order = list(new_order.values())[0] if isinstance(list(new_order.values())[0], list) else []
            elif isinstance(new_order, dict):
                 new_order = []
        except Exception as json_e:
            print(f"[RERANK JSON ERROR] Failed to parse: {json_e} | Content: {content[:100]}...")
            new_order = []

        reranked_items = []
        seen_indices = set()
        for idx in new_order:
            if 0 <= idx < len(items) and idx not in seen_indices:
                items[idx]["search_type"] = "hybrid + reranked"
                reranked_items.append(items[idx])
                seen_indices.add(idx)
        
        for i, item in enumerate(items):
            if i not in seen_indices:
                reranked_items.append(item)
                
        return reranked_items, response.usage
        
    except Exception as e:
        print(f"[RERANK ERROR] Failed to rerank: {e}")
        return items, None

async def evaluate_rag_relevance(query: str, items: list[dict], model: str = "gpt-4o-mini", fallback: str = None, q_label: str = "Pergunta", a_label: str = "Resposta", m_label: str = "Metadado"):
    """Agentic step: Validates each retrieved item and returns only those that are truly relevant."""
    if not items:
        return [], None
        
    # Security bypass: If an item has a very high vector similarity, keep it regardless of evaluation
    # (Distance < 0.45 is usually a very strong match in cosine distance)
    TRUST_THRESHOLD = 0.45
    trusted_items = [i for i in items if i.get("distance") is not None and i.get("distance") < TRUST_THRESHOLD]
    
    try:
        context = ""
        for i, item in enumerate(items):
            meta_prefix = f"{m_label}: {item.get('metadata_val', '')} | " if item.get('metadata_val') else ""
            context += f"Conhecimento [{i}] (ID: {item['id']}): {meta_prefix}{item['question'] if q_label == 'Pergunta' else q_label + ': ' + item['question']} -> {item['answer'][:400] if a_label == 'Resposta' else a_label + ': ' + item['answer'][:400]}\n"
            
        prompt = f"""
Sua tarefa é agir como um filtro de relevância para um sistema RAG (Busca de Conhecimento).
Pergunta do Usuário: "{query}"

Conhecimentos Recrutados:
{context}

Analise item por item e determine quais são ÚTEIS para responder à pergunta. 
Siga estas diretrizes:
1. Seja PERMISSIVO: Se o assunto for o mesmo, mantenha o item.
2. Sinônimos: 'Matriz' e 'Matriz de Fidelidade' indicam o mesmo assunto. 'Dívidas' e 'Débitos' também.
3. Parcialmente Útil: Se o conhecimento explica como chegar na resposta ou dá contexto relacionado, é ÚTIL.
4. Lixo/Irrelevante: Apenas descarte se o assunto for totalmente diferente (ex: o usuário pergunta de 'Preços' e o item fala de 'Faltas de Funcionários').

Responda APENAS com um objeto JSON contendo a lista de índices considerados úteis.
Exemplo: {{"useful_indices": [0, 2]}}
Se NADA for minimamente útil, responda: {{"useful_indices": []}}
"""
        response = await call_rag_llm(
            model="gpt-4o-mini", 
            fallback=model,
            max_tokens=200,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.choices[0].message.content.strip()
        try:
            data = json.loads(content)
            useful_indices = data.get("useful_indices", [])
        except:
            # Fallback if JSON fails
            if "SIM" in content.upper() or "[" in content:
                useful_indices = list(range(len(items))) # Keep all on error if it looks positive
            else:
                useful_indices = []

        # Merge trusted items with items chosen by LLM
        final_indices = set(useful_indices)
        for i, item in enumerate(items):
            if item.get("distance") is not None and item.get("distance") < TRUST_THRESHOLD:
                final_indices.add(i)
        
        relevant_items = [items[idx] for idx in sorted(list(final_indices)) if idx < len(items)]
        
        # If we had items but everything was filtered, let's at least keep the TOP 1 if its distance is decent
        if not relevant_items and items and items[0].get("distance", 1.0) < 0.6:
             relevant_items = [items[0]]

        return relevant_items, response.usage
            
    except Exception as e:
        print(f"[AGENTIC RAG ERROR] Evaluation failed: {e}")
        return items, None

async def generate_multi_queries(query: str, count: int = 3, model: str = "gpt-4o-mini", fallback: str = None):
    """Generates multiple variations of the query to improve retrieval coverage."""
    try:
        prompt = f"""
Sua tarefa é gerar {count} variações curtas e diferentes da pergunta do usuário para ajudar na busca em um banco de dados.
Gere perguntas que foquem em diferentes palavras-chave ou intenções contidas na pergunta original.

Pergunta Original: "{query}"

Responda APENAS com uma lista JSON de strings.
Exemplo: ["pergunta 1", "pergunta 2", "pergunta 3"]
"""
        response = await call_rag_llm(
            model=model,
            fallback=fallback,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.choices[0].message.content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
            
        data = json.loads(content)
        if isinstance(data, dict):
            queries = list(data.values())[0] if isinstance(list(data.values())[0], list) else []
        else:
            queries = data
            
        if query not in queries:
            queries.append(query)
            
        return queries[:count+1], response.usage
    except Exception as e:
        print(f"[MULTI-QUERY ERROR] Failed to generate: {e}")
        return [query], None
