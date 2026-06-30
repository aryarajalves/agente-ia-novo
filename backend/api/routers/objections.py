import logging
import os
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from typing import List, Optional
from openai import AsyncOpenAI

# Machine Learning local para agrupamento
from sklearn.cluster import DBSCAN
import numpy as np

from models import (
    InteractionLog, 
    UserQuestionEmbedding, 
    ObjectionCluster, 
    ObjectionClusterMessage,
    AgentConfigModel
)
from api.deps import get_db, verify_api_key
from rag_service import get_batch_embeddings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/objections", tags=["Analytics - Objections"])

@router.get("")
async def get_objections(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Retorna o ranking de dúvidas e objeções salvas em cache para o agente.
    """
    # Validar se o agente existe
    agent_res = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    # Buscar clusters cacheados ordenados por frequência (count) decrescente
    clusters_res = await db.execute(
        select(ObjectionCluster)
        .where(ObjectionCluster.agent_id == agent_id)
        .order_by(ObjectionCluster.count.desc())
    )
    clusters = clusters_res.scalars().all()

    # Montar resposta estruturada
    result = []
    for cluster in clusters:
        # Buscar as perguntas exemplares associadas
        msg_res = await db.execute(
            select(ObjectionClusterMessage.question_text)
            .where(ObjectionClusterMessage.cluster_id == cluster.id)
            .limit(10)
        )
        examples = msg_res.scalars().all()
        
        result.append({
            "id": cluster.id,
            "category_name": cluster.cluster_label,
            "representative_question": cluster.representative_question,
            "suggested_script": cluster.suggested_script,
            "count": cluster.count,
            "updated_at": cluster.updated_at,
            "examples": examples
        })

    return {
        "agent_id": agent_id,
        "total_clusters": len(result),
        "clusters": result
    }

@router.post("/recalculate")
async def recalculate_objections(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key)
):
    """
    Recalcula sob demanda o ranking de dúvidas do agente.
    Possui uma trava temporal (rate-limit) de 15 minutos para evitar abuso de tokens da OpenAI.
    """
    # 1. Validar se o agente existe
    agent_res = await db.execute(select(AgentConfigModel).where(AgentConfigModel.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    # 2. Rate-limit temporal: verificar o último cluster atualizado deste agente
    last_updated_res = await db.execute(
        select(ObjectionCluster.updated_at)
        .where(ObjectionCluster.agent_id == agent_id)
        .order_by(ObjectionCluster.updated_at.desc())
        .limit(1)
    )
    last_updated = last_updated_res.scalar()
    
    if last_updated:
        # Garantir timezone-awareness
        if last_updated.tzinfo is None:
            last_updated = last_updated.replace(tzinfo=timezone.utc)
            
        time_elapsed = datetime.now(timezone.utc) - last_updated
        if time_elapsed < timedelta(minutes=15):
            minutes_left = int(15 - (time_elapsed.total_seconds() / 60))
            # Se for atualizado recentemente, retorna os dados cacheados diretamente sem reprocessar
            logger.info(f"Recálculo ignorado para agente_id={agent_id}. Atualizado recentemente ({minutes_left} min restantes).")
            cached_data = await get_objections(agent_id, db, _)
            cached_data["message"] = f"Ranking atualizado recentemente. Nova atualização disponível em {minutes_left} minutos."
            return cached_data

    logger.info(f"Iniciando recálculo de dúvidas para agente_id={agent_id}...")

    # 3. Buscar logs de interações nos últimos 30 dias
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    query = (
        select(InteractionLog)
        .where(
            InteractionLog.agent_id == agent_id,
            InteractionLog.user_message != None,
            InteractionLog.user_message != "",
            InteractionLog.timestamp >= thirty_days_ago
        )
        .order_by(InteractionLog.timestamp.desc())
        .limit(1000) # Evita carregar dados em excesso
    )
    res = await db.execute(query)
    logs = res.scalars().all()

    if not logs:
        return {"message": "Sem interações registradas nos últimos 30 dias para este agente.", "clusters": []}

    # 4. Descobrir quais logs ainda não possuem embeddings gerados
    emb_query = select(UserQuestionEmbedding.interaction_log_id).where(UserQuestionEmbedding.agent_id == agent_id)
    emb_res = await db.execute(emb_query)
    existing_log_ids = set(emb_res.scalars().all())

    new_logs = [log for log in logs if log.id not in existing_log_ids]

    # 5. Gerar embeddings pendentes em lotes (batch) e salvar
    if new_logs:
        logger.info(f"Gerando embeddings para {len(new_logs)} novas mensagens...")
        texts = [log.user_message for log in new_logs]
        
        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            batch_logs = new_logs[i:i+batch_size]
            
            try:
                embeddings_list, _ = await get_batch_embeddings(batch_texts)
                
                for log, embedding in zip(batch_logs, embeddings_list):
                    if embedding:
                        # pgvector espera uma lista de floats
                        db_emb = UserQuestionEmbedding(
                            interaction_log_id=log.id,
                            agent_id=agent_id,
                            question_text=log.user_message,
                            embedding=embedding
                        )
                        db.add(db_emb)
                await db.commit()
            except Exception as e:
                logger.error(f"Erro ao gerar embeddings em lote no recálculo: {e}")
                await db.rollback()

    # 6. Carregar todos os embeddings do agente gerados nos últimos 30 dias
    all_embs_res = await db.execute(
        select(UserQuestionEmbedding)
        .where(
            and_(
                UserQuestionEmbedding.agent_id == agent_id,
                UserQuestionEmbedding.created_at >= thirty_days_ago
            )
        )
    )
    db_embeddings = all_embs_res.scalars().all()

    # Filtra os embeddings válidos (não nulos)
    valid_embs = [emb for emb in db_embeddings if emb.embedding is not None]

    if len(valid_embs) < 2:
        return {"message": "Dúvidas insuficientes para gerar ranking. Mínimo necessário: 2 mensagens históricas.", "clusters": []}

    # 7. Clusterização local DBSCAN
    embeddings_list = [emb.embedding for emb in valid_embs]
    questions_list = [emb.question_text for emb in valid_embs]

    embeddings_array = np.array(embeddings_list)
    
    # eps=0.15 significa similaridade de cosseno >= 0.85
    # min_samples=2 significa que precisa de 2 mensagens parecidas para formar um grupo
    dbscan = DBSCAN(eps=0.15, min_samples=2, metric="cosine")
    labels = dbscan.fit_predict(embeddings_array)

    unique_labels = set(labels)
    # Remove -1 (outliers/ruídos)
    if -1 in unique_labels:
        unique_labels.remove(-1)

    if not unique_labels:
        # Se nenhuma mensagem formou um grupo
        return {"message": "Não foram detectados grupos de dúvidas repetidas.", "clusters": []}

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY não configurada no servidor."
        )

    # 8. Limpar clusters cacheados antigos deste agente
    await db.execute(delete(ObjectionCluster).where(ObjectionCluster.agent_id == agent_id))
    await db.commit()

    client = AsyncOpenAI(api_key=openai_key)

    # 9. Processar cada cluster gerando título e script via LLM
    for label in unique_labels:
        # Índices dos elementos deste cluster
        cluster_indices = np.where(labels == label)[0]
        cluster_size = len(cluster_indices)

        # Encontrar a pergunta representativa (o medoide)
        cluster_embeddings = embeddings_array[cluster_indices]
        centroid = np.mean(cluster_embeddings, axis=0)
        similarities = np.dot(cluster_embeddings, centroid)
        best_idx = cluster_indices[np.argmax(similarities)]
        representative_question = questions_list[best_idx]

        # Amostra de perguntas reais do grupo
        sample_questions = [questions_list[idx] for idx in cluster_indices[:15]]

        # Prompt para OpenAI nomear o cluster e sugerir o script de vendas
        system_prompt = """Você é um especialista em vendas e escrita persuasiva (copywriting).
Sua tarefa é analisar uma lista de dúvidas/perguntas frequentes reais que leads fizeram a um agente de IA.
Você deve:
1. Dar um nome de categoria curto e comercial para este grupo (ex: "Preços e Planos", "Segurança de Dados", "Processo de Entrega"). Máximo 5 palavras.
2. Escrever um script de resposta altamente persuasivo e natural (de 2 a 3 frases) que resolve de vez a dúvida e quebra a objeção do cliente.

Você DEVE responder EXCLUSIVAMENTE com um JSON estruturado no formato abaixo, sem blocos de código markdown ou explicações externas:
{
  "category_name": "Nome da Categoria",
  "suggested_script": "Script persuasivo de quebra de objeção..."
}
"""
        user_prompt = "Dúvidas frequentes coletadas dos leads:\n" + "\n".join([f"- {q}" for q in sample_questions])

        try:
            completion = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            
            result_json = json.loads(completion.choices[0].message.content)
            category_name = result_json.get("category_name", f"Grupo de Dúvidas #{label}")
            suggested_script = result_json.get("suggested_script", "Resposta não gerada pela IA.")
        except Exception as err:
            logger.error(f"Erro ao chamar LLM para nomear cluster: {err}")
            category_name = f"Dúvidas sobre: {representative_question[:30]}..."
            suggested_script = "Por favor, crie uma resposta persuasiva para contornar essa dúvida."

        # Salvar o cluster
        db_cluster = ObjectionCluster(
            agent_id=agent_id,
            cluster_label=category_name,
            representative_question=representative_question,
            suggested_script=suggested_script,
            count=cluster_size
        )
        db.add(db_cluster)
        await db.flush() # Gera o ID do cluster

        # Salvar as mensagens exemplares associadas
        # Usamos no máximo 10 exemplos únicos para visualização
        saved_questions = set()
        for idx in cluster_indices:
            q_text = questions_list[idx]
            if q_text not in saved_questions:
                saved_questions.add(q_text)
                db_msg = ObjectionClusterMessage(
                    cluster_id=db_cluster.id,
                    question_text=q_text
                )
                db.add(db_msg)
                if len(saved_questions) >= 10:
                    break

    await db.commit()
    logger.info(f"Recálculo finalizado com sucesso para agente_id={agent_id}.")

    # Retorna o ranking atualizado
    return await get_objections(agent_id, db, _)
