import pytest
from httpx import AsyncClient
from models import TranscriptionTaskModel
from sqlalchemy import select, delete

@pytest.mark.asyncio
async def test_bulk_delete_transcription_tasks(client: AsyncClient, db_session):
    # 1. Limpar e criar tarefas de teste
    await db_session.execute(delete(TranscriptionTaskModel))
    
    tasks = [
        TranscriptionTaskModel(filename=f"test_{i}.mp4", status="SUCCESS")
        for i in range(5)
    ]
    for t in tasks:
        db_session.add(t)
    await db_session.commit()
    
    # Pegar IDs criados
    result = await db_session.execute(select(TranscriptionTaskModel.id))
    task_ids = result.scalars().all()
    assert len(task_ids) == 5
    
    # 2. Deletar 3 tarefas
    ids_to_delete = task_ids[:3]
    response = await client.post(
        "/transcription-tasks/bulk-delete",
        json={"task_ids": ids_to_delete}
    )
    
    assert response.status_code == 200
    assert "3 registros removidos" in response.json()["message"]
    
    # 3. Verificar se restaram 2
    result = await db_session.execute(select(TranscriptionTaskModel.id))
    remaining_ids = result.scalars().all()
    assert len(remaining_ids) == 2
    for tid in ids_to_delete:
        assert tid not in remaining_ids

@pytest.mark.asyncio
async def test_bulk_delete_empty(client: AsyncClient, db_session):
    response = await client.post(
        "/transcription-tasks/bulk-delete",
        json={"task_ids": []}
    )
    assert response.status_code == 200
    assert "Nenhum ID fornecido" in response.json()["message"]
