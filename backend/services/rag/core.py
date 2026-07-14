import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from models import KnowledgeItemModel, KnowledgeBaseModel, AgentConfigModel
from .providers import get_embedding
from .language import detect_language, translate_to_portuguese
from .agentic import generate_multi_queries, rerank_results, evaluate_rag_relevance

async def search_knowledge_base(
    db: AsyncSession, 
    query: str, 
    kb_id: int = None,
    kb_ids: list[int] = None,
    agent_id: int = None,
    limit: int = 5,
    similarity_threshold: float = 0.0,
    model: str = "gpt-4o-mini",
    fallback_model: str = None,
    # Forçar configurações
    force_translation: bool = None,
    force_multi_query: bool = None,
    force_rerank: bool = None,
    force_agentic_eval: bool = None,
    force_parent_expansion: bool = None
):
    """
    Searches for relevant knowledge items using vector similarity.
    Supports single KB, multiple KBs, or agent-linked KBs.
    """
    
    # 1. Determine target KB IDs and features
    target_ids = set()
    rag_translation_enabled = False
    rag_multi_query_enabled = False
    rag_rerank_enabled = True
    rag_agentic_eval_enabled = True
    rag_parent_expansion_enabled = True
    
    if kb_ids:
        target_ids.update(kb_ids)
    if kb_id:
        target_ids.add(kb_id)
        
    if agent_id:
        stmt = (
            select(AgentConfigModel)
            .where(AgentConfigModel.id == agent_id)
            .options(selectinload(AgentConfigModel.knowledge_bases))
        )
        result = await db.execute(stmt)
        agent = result.scalars().first()
        
        if agent:
            if not target_ids:
                for kb in agent.knowledge_bases:
                    target_ids.add(kb.id)
                if agent.knowledge_base_id:
                    target_ids.add(agent.knowledge_base_id)
                    
            if hasattr(agent, 'rag_translation_enabled'):
                rag_translation_enabled = agent.rag_translation_enabled
                rag_multi_query_enabled = agent.rag_multi_query_enabled
                rag_rerank_enabled = agent.rag_rerank_enabled
                rag_agentic_eval_enabled = agent.rag_agentic_eval_enabled
                rag_parent_expansion_enabled = agent.rag_parent_expansion_enabled
                
    if force_translation is not None: rag_translation_enabled = force_translation
    if force_multi_query is not None: rag_multi_query_enabled = force_multi_query
    if force_rerank is not None: rag_rerank_enabled = force_rerank
    if force_agentic_eval is not None: rag_agentic_eval_enabled = force_agentic_eval
    if force_parent_expansion is not None: rag_parent_expansion_enabled = force_parent_expansion
            
    if not target_ids:
        return [], None

    try:
        total_prompt_tokens = 0
        total_completion_tokens = 0
        
        def add_usage(usage):
            nonlocal total_prompt_tokens, total_completion_tokens
            if usage:
                p = getattr(usage, 'prompt_tokens', 0)
                c = getattr(usage, 'completion_tokens', 0)
                if p == 0 and hasattr(usage, 'total_tokens'):
                    p = usage.total_tokens
                total_prompt_tokens += p
                total_completion_tokens += c

        # 2. Query Transformation
        detected_lang = "portuguese"
        if rag_translation_enabled:
            detected_lang, u_lang = await detect_language(query, model=model, fallback=fallback_model)
            add_usage(u_lang)
        
        if rag_multi_query_enabled:
            query_variations, u_multi = await generate_multi_queries(query, count=2, model=model, fallback=fallback_model)
            add_usage(u_multi)
        else:
            query_variations = [query]
        
        # 3. Process queries
        all_scores = {}
        k = 60 # RRF Constant

        for q_var in query_variations:
            search_q = q_var
            if rag_translation_enabled and detected_lang != "portuguese" and detected_lang != "simple":
                search_q, u_trans = await translate_to_portuguese(q_var, model=model, fallback=fallback_model)
                add_usage(u_trans)
                
            q_embedding, u_emb = await get_embedding(search_q)
            add_usage(u_emb)
            
            if not q_embedding: continue

            try:
                # Vector Search
                dist_col = KnowledgeItemModel.embedding.cosine_distance(q_embedding).label("distance")
                v_stmt = select(KnowledgeItemModel, dist_col).where(
                    KnowledgeItemModel.knowledge_base_id.in_(target_ids),
                    KnowledgeItemModel.embedding.is_not(None)
                ).order_by(dist_col).limit(limit)
                
                v_res = await db.execute(v_stmt)
                for rank, (item, dist) in enumerate(v_res.all(), start=1):
                    if item.id not in all_scores:
                        all_scores[item.id] = {"item": item, "score": 0.0, "vector_dist": dist}
                    all_scores[item.id]["score"] += 1.0 / (k + rank)
                    if dist < all_scores[item.id].get("vector_dist", 1.0):
                        all_scores[item.id]["vector_dist"] = dist

                # Keyword Search (FTS)
                fts_q = text(f"to_tsvector('portuguese', coalesce(question, '') || ' ' || coalesce(answer, '') || ' ' || coalesce(metadata_val, '')) @@ websearch_to_tsquery('portuguese', :q)")
                f_stmt = select(KnowledgeItemModel).where(
                    KnowledgeItemModel.knowledge_base_id.in_(target_ids),
                    fts_q
                ).params(q=search_q).limit(limit)

                f_res = await db.execute(f_stmt)
                for rank, item in enumerate(f_res.scalars().all(), start=1):
                    if item.id not in all_scores:
                        all_scores[item.id] = {"item": item, "score": 0.0}
                    all_scores[item.id]["score"] += 1.0 / (k + rank)
            except Exception as e:
                print(f"[RAG ERROR] Variação falhou: {e}")
                continue

        # 4. Filter and Rank
        hybrid_results = sorted(all_scores.values(), key=lambda x: x["score"], reverse=True)[:limit * 3]
        final_items = []
        for res in hybrid_results:
            item = res["item"]
            distance = res.get("vector_dist")
            similarity_score = max(0, min(1.0, 1.0 - distance)) if distance is not None else 0.0
            
            final_items.append({
                "id": item.id, "question": item.question, "answer": item.answer,
                "metadata_val": item.metadata_val, "category": item.category,
                "metadata": json.loads(item.source_metadata) if item.source_metadata else None,
                "kb_id": item.knowledge_base_id, "rrf_score": res["score"],
                "distance": distance, "relevance_score": round(similarity_score, 4),
                "search_type": "multi-query-hybrid"
            })

        if not final_items: return [], None

        # 5. Reranking
        main_search_q = query
        if rag_translation_enabled and detected_lang != "portuguese" and detected_lang != "simple":
            main_search_q, u_trans_final = await translate_to_portuguese(query, model=model, fallback=fallback_model)
            add_usage(u_trans_final)

        q_label, a_label, m_label = "Pergunta", "Resposta", "Metadado"
        if target_ids:
            first_kb_id = list(target_ids)[0]
            kb_res = await db.execute(select(KnowledgeBaseModel).where(KnowledgeBaseModel.id == first_kb_id))
            kb = kb_res.scalars().first()
            if kb:
                q_label, a_label, m_label = kb.question_label or "Pergunta", kb.answer_label or "Resposta", kb.metadata_label or "Metadado"

        if rag_rerank_enabled:
            reranked_items, u_rerank = await rerank_results(main_search_q, final_items, model=model, fallback=fallback_model, q_label=q_label, a_label=a_label, m_label=m_label)
            add_usage(u_rerank)
        else:
            reranked_items = final_items
            
        # 7. Parent Document Retrieval
        expanded_items = []
        if rag_parent_expansion_enabled:
            for res_item in reranked_items[:limit]:
                item_id = res_item.get("id")
                stmt = select(KnowledgeItemModel).where(KnowledgeItemModel.id == item_id)
                db_res = await db.execute(stmt)
                db_item = db_res.scalars().first()
                
                if db_item and db_item.parent_id:
                    parent_stmt = select(KnowledgeItemModel).where(KnowledgeItemModel.id == db_item.parent_id)
                    parent_res = await db.execute(parent_stmt)
                    parent_item = parent_res.scalars().first()
                    
                    if parent_item:
                        expanded_items.append({
                            "id": parent_item.id, "question": parent_item.question, "answer": parent_item.answer,
                            "metadata_val": parent_item.metadata_val, "category": parent_item.category,
                            "metadata": json.loads(parent_item.source_metadata) if parent_item.source_metadata else None,
                            "kb_id": parent_item.knowledge_base_id, "rrf_score": res_item.get("rrf_score"),
                            "distance": res_item.get("distance"), "relevance_score": res_item.get("relevance_score"),
                            "search_type": "parent_expanded"
                        })
                        continue
                expanded_items.append(res_item)
        else:
            expanded_items = reranked_items[:limit]

        # 8. Agentic Selection
        final_filtered_items = expanded_items[:limit]
        discarded_items = []
        if rag_agentic_eval_enabled:
            eval_input = expanded_items[:limit]
            final_filtered_items, discarded_eval, u_eval = await evaluate_rag_relevance(main_search_q, eval_input, model=model, fallback=fallback_model, q_label=q_label, a_label=a_label, m_label=m_label)
            add_usage(u_eval)
            discarded_items.extend(discarded_eval)
            
            if not final_filtered_items and eval_input:
                best = eval_input[0]
                best_dist = best.get('distance')
                if best_dist is not None and best_dist < 0.65:
                    final_filtered_items = [best]
                    discarded_items = [x for x in discarded_items if x["id"] != best["id"]]

        # Coletar itens que não entraram na seleção (fora do limit) como descartados por ranking
        for item in expanded_items[limit:]:
            item_copy = dict(item)
            item_copy["discard_reason"] = "Fora do limite máximo de resultados (limit: {}).".format(limit)
            discarded_items.append(item_copy)

        # 9. Filtro de Relevância Mínima
        # Descarta itens cuja relevance_score fique abaixo do limiar configurado,
        # garantindo que só o que realmente atinge o % mínimo seja enviado ao RAG.
        if similarity_threshold and similarity_threshold > 0:
            threshold_filtered = []
            for item in final_filtered_items:
                if item.get("relevance_score") is None or item.get("relevance_score") >= similarity_threshold:
                    threshold_filtered.append(item)
                else:
                    item_copy = dict(item)
                    item_copy["discard_reason"] = f"Relevância inferior ao limiar mínimo configurado ({round(similarity_threshold*100, 1)}%). Relevância do item: {round(item.get('relevance_score', 0.0)*100, 1)}%."
                    discarded_items.append(item_copy)
            final_filtered_items = threshold_filtered

        class RAGUsage:
            def __init__(self, p, c, model):
                self.prompt_tokens = p
                self.completion_tokens = c
                self.model = model

        return final_filtered_items, discarded_items, RAGUsage(total_prompt_tokens, total_completion_tokens, model)
            
    except Exception as e:
        print(f"Hybrid search failed: {e}")
        return [], [], None

async def calculate_coverage(
    db: AsyncSession, questions: list[str], kb_id: int,
    similarity_threshold_low: float = 0.65, similarity_threshold_high: float = 0.82
):
    results = []
    for question in questions:
        res = await search_knowledge_base(db, query=question, kb_ids=[kb_id], limit=1)
        if isinstance(res, tuple) and len(res) == 3:
            matches, _, _ = res
        elif isinstance(res, tuple) and len(res) == 2:
            matches, _ = res
        else:
            matches = res or []
        status = "red"
        best_match = None
        score = 0.0
        if matches:
            best = matches[0]
            score = best.get('rrf_score', 0.0)
            if 'distance' in best: score = 1.0 - best['distance']
            if score > 1.0: score = 1.0
            if score < -1.0: score = -1.0
            best_match = best
            if score >= similarity_threshold_high: status = "green"
            elif score >= similarity_threshold_low: status = "yellow"
            else: status = "red"
        results.append({"question": question, "status": status, "score": score, "best_match": best_match})
    return results
