import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock
from models import KnowledgeBaseModel, KnowledgeItemModel
from sqlalchemy import select, delete

@pytest.mark.asyncio
async def test_generate_qa_from_transcription(client: AsyncClient):
    """Test standard QA generation from a transcription text endpoint with multi-level patch."""
    mock_qa = [
        {"pergunta": "Qual o foco da aula?", "resposta": "O foco é inteligência artificial.", "categoria": "Treinamento"}
    ]
    
    # Mockando generate_global_qa em todos os namespaces possíveis de importação
    with patch("smart_importer.generate_global_qa", new_callable=AsyncMock) as mock_generate_smart, \
         patch("api.routers.knowledge.generate_global_qa", new_callable=AsyncMock) as mock_generate_api:
        
        mock_generate_smart.return_value = (mock_qa, {})
        mock_generate_api.return_value = (mock_qa, {})
        
        response = await client.post(
            "/knowledge-bases/generate-qa-from-transcription",
            json={"text": "A inteligência artificial mudará o mundo da automação.", "total_questions": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["pergunta"] == "Qual o foco da aula?"
        assert data[0]["resposta"] == "O foco é inteligência artificial."

@pytest.mark.asyncio
async def test_add_batch_knowledge_items(client: AsyncClient, db_session):
    """Test batch incremental addition of knowledge items with valid 1536-dim embedding vector."""
    # 1. Limpar e criar KB de teste
    await db_session.execute(delete(KnowledgeItemModel))
    await db_session.execute(delete(KnowledgeBaseModel))
    await db_session.commit()
    
    kb = KnowledgeBaseModel(name="Base de Teste", description="Test Base Description")
    db_session.add(kb)
    
    # Adicionar um item preexistente para garantir que não será deletado (salvamento incremental)
    existing_item = KnowledgeItemModel(
        knowledge_base=kb,
        question="Pergunta Existente",
        answer="Resposta Existente",
        category="Geral"
    )
    db_session.add(existing_item)
    await db_session.commit()
    await db_session.refresh(kb)
    await db_session.refresh(existing_item)
    
    kb_id = kb.id
    existing_item_id = existing_item.id
    
    # Vetor de embedding válido de 1536 dimensões para pgvector
    mock_embedding = [0.1] * 1536
    
    # Mockando get_embedding em todos os namespaces possíveis
    with patch("rag_service.get_embedding", new_callable=AsyncMock) as mock_get_emb_rag, \
         patch("api.routers.knowledge.get_embedding", new_callable=AsyncMock) as mock_get_emb_api:
        
        mock_get_emb_rag.return_value = (mock_embedding, None)
        mock_get_emb_api.return_value = (mock_embedding, None)
        
        items_payload = {
            "items": [
                {
                    "question": "Nova Pergunta 1",
                    "answer": "Nova Resposta 1",
                    "category": "Treinamento",
                    "metadata_val": "Fonte: Transcrição"
                },
                {
                    "question": "Nova Pergunta 2",
                    "answer": "Nova Resposta 2",
                    "category": "Treinamento",
                    "metadata_val": "Fonte: Transcrição"
                }
            ]
        }
        
        response = await client.post(
            f"/knowledge-bases/{kb_id}/items/add-batch",
            json=items_payload
        )
        
        assert response.status_code == 200
        assert "novos itens adicionados" in response.json()["message"].lower()
        
        # 3. Validar integridade dos dados no banco
        # O item preexistente DEVE continuar lá intocado!
        res_existing = await db_session.execute(
            select(KnowledgeItemModel).where(KnowledgeItemModel.id == existing_item_id)
        )
        assert res_existing.scalar_one_or_none() is not None
        
        # Os dois novos itens devem estar no banco associados à base correta e com os embeddings gerados
        res_new = await db_session.execute(
            select(KnowledgeItemModel).where(
                KnowledgeItemModel.knowledge_base_id == kb_id,
                KnowledgeItemModel.category == "Treinamento"
            )
        )
        new_items = res_new.scalars().all()
        assert len(new_items) == 2
        
        questions = [item.question for item in new_items]
        assert "Nova Pergunta 1" in questions
        assert "Nova Pergunta 2" in questions
        
        # Verificar se os embeddings foram salvos corretamente
        assert len(new_items[0].embedding) == 1536
        assert new_items[0].embedding[0] == pytest.approx(0.1)
